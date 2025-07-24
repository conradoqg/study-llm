import { tool } from '@openai/agents'
import sgMail from '@sendgrid/mail'
import { z } from 'zod'
import Terminal from '../terminal.ts'
import { dedent } from 'ts-dedent'
import { htmlToMarkdown } from 'mdream'

const SendEmailParameter = z.object({
    subject: z.string().describe('The subject of the email to send'),
    body: z.string().describe('The email content to send'),
})
type SendEmailParameterType = z.infer<typeof SendEmailParameter>
type SendEmailReturnType = { status: string }

export const sendEmailTool = tool({
    name: 'send_email',
    description: 'Send out an email with the given body to all sales prospects using SendGrid',
    parameters: SendEmailParameter,
    execute: async ({ subject, body }: SendEmailParameterType): Promise<SendEmailReturnType> => {
        const key = process.env.SENDGRID_API_KEY
        const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'ed@edwarddonner.com';
        const toEmail = process.env.SENDGRID_TO_EMAIL || 'ed.donner@gmail.com';
        const mailData: sgMail.MailDataRequired = {
            to: toEmail,
            from: fromEmail,
            subject,
            content: [{ type: "text/plain", value: body }],
        };
        if (key) {
            sgMail.setApiKey(key);
            await sgMail.send(mailData);
        }

        Terminal.spinner.push(Terminal.renderMarkdown(dedent`
            ### Email sent successfully
            |To|From|Subject|
            |---|---|---|
            |${toEmail}|${fromEmail}|${subject}|
            
            ${body}
            `))

        return { status: 'success' };
    },
})

export const sendHTMLEmailTool = tool({
    name: 'send_email',
    description: 'Send out an email with the given body to all sales prospects using SendGrid',
    parameters: SendEmailParameter,
    execute: async ({ subject, body }: SendEmailParameterType): Promise<SendEmailReturnType> => {
        const key = process.env.SENDGRID_API_KEY
        const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'ed@edwarddonner.com';
        const toEmail = process.env.SENDGRID_TO_EMAIL || 'ed.donner@gmail.com';
        const mailData: sgMail.MailDataRequired = {
            to: toEmail,
            from: fromEmail,
            subject,
            content: [{ type: "text/html", value: body }],
        };
        if (key) {
            sgMail.setApiKey(key);
            await sgMail.send(mailData);
        }

        Terminal.spinner.push(Terminal.renderMarkdown(dedent`
            ### Email sent successfully
            |To|From|Subject|
            |---|---|---|
            |${toEmail}|${fromEmail}|${subject}|

            ${htmlToMarkdown(body)}
            `)
        )

        return { status: 'success' };
    },
})