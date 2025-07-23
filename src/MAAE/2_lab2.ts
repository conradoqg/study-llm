import { Agent, run, withTrace } from '@openai/agents'
import { input } from '@inquirer/prompts'
import { dedent } from 'ts-dedent'
import terminal from './common/terminal.ts'
import { sendEmailTool, sendHTMLEmailTool } from './common/sendMailTool.ts'

// Instantiate three sales-writing agents (cells 153–185)
const salesAgent1 = new Agent({
    name: 'Professional Sales Agent',
    instructions: 'You are a sales agent working for ComplAI, a company that provides a SaaS tool for ensuring SOC2 compliance and preparing for audits, powered by AI. You write professional, serious cold emails.',
    model: 'gpt-4o-mini',
})
const salesAgent2 = new Agent({
    name: 'Engaging Sales Agent',
    instructions: 'You are a humorous, engaging sales agent working for ComplAI, a company that provides a SaaS tool for ensuring SOC2 compliance and preparing for audits, powered by AI. You write witty, engaging cold emails that are likely to get a response.',
    model: 'gpt-4o-mini',
})
const salesAgent3 = new Agent({
    name: 'Busy Sales Agent',
    instructions: 'You are a busy sales agent working for ComplAI, a company that provides a SaaS tool for ensuring SOC2 compliance and preparing for audits, powered by AI. You write concise, to the point cold emails.',
    model: 'gpt-4o-mini',
})

const salesTools = [
    salesAgent1.asTool({ toolName: 'sales_agent1', toolDescription: 'Write a cold sales email' }),
    salesAgent2.asTool({ toolName: 'sales_agent2', toolDescription: 'Write a cold sales email' }),
    salesAgent3.asTool({ toolName: 'sales_agent3', toolDescription: 'Write a cold sales email' }),
]

// Lab 0: Test email stub function
export async function sendTestEmail() {
    terminal.logMarkdown('## 🥼 Lab 2.0: Sending test email stub')
    const body = await input({ prefill: 'editable', default: 'Send a test email to confirm the email sending functionality is working.', message: 'Enter the email body:' })
    const result = await sendEmailTool.invoke(null, JSON.stringify({ body, subject: 'Test email from ComplAI' }))
    terminal.logMarkdown(dedent`
        ### Tool result
        ${terminal.renderJSON(result)}
        `)
}

// Lab 1: Agent workflow
export async function agentWorkflow() {
    {
        terminal.logMarkdown('## 🥼 Lab 2.1.1.1: Professional Sales Agent')
        const inputText = await input({ prefill: 'editable', default: 'Write a cold sales email', message: 'Enter the prompt for the Professional Sales Agent:' })

        await withTrace('Lab 1.1.1: Streaming from Professional Sales Agent', async (trace) => {
            terminal.spinner.start()
            const result = await run(salesAgent1, inputText)
            terminal.spinner.success()
            terminal.logMarkdown(result.finalOutput)
            terminal.logTrace(trace)
        })
    }

    let outputs: string[] = []

    {
        terminal.logMarkdown('## 🥼 Lab 2.1.1.2: Parallel cold emails')
        const inputText = await input({ prefill: 'editable', default: 'Write a cold sales email', message: 'Enter the prompt for the Parallel Sales Agent:' })

        await withTrace('Parallel cold emails', async (trace) => {
            terminal.spinner.start()
            const results = await Promise.all([
                run(salesAgent1, inputText),
                run(salesAgent2, inputText),
                run(salesAgent3, inputText),
            ])
            terminal.spinner.success()
            outputs = results.map((r) => r.finalOutput)
            outputs.forEach((output, i) => {
                terminal.logMarkdown(dedent`### Cold email from Sales Agent ${i + 1}
                ${output}
                `)
            })

            terminal.logTrace(trace)
        })
    }

    {
        terminal.logMarkdown('## 🥼 Lab 2.1.2: Picking best cold email')

        const salesPicker = new Agent({
            name: 'sales_picker',
            instructions: 'You pick the best cold sales email from the given options. Imagine you are a customer and pick the one you are most likely to respond to. Do not give an explanation; reply with the selected email only.',
            model: 'gpt-4o-mini',
        })

        const combined = outputs.join('\n\n')

        await withTrace('Selection from sales people', async (trace) => {
            terminal.spinner.start()
            const pickResult = await run(salesPicker, combined)
            terminal.spinner.success()
            terminal.logMarkdown(dedent`### Best cold email picked by Sales Picker
                ${pickResult.finalOutput}
                `)
            terminal.logTrace(trace)
        })
    }
}

// Lab 2: Sales Manager with tools
export async function toolWorkflow() {
    terminal.logMarkdown('## 🥼 Lab 2.2: Sales Manager with tools')

    const tools = [...salesTools, sendEmailTool]
    const salesManager = new Agent({
        name: 'Sales Manager',
        instructions:
            'You are a sales manager working for ComplAI. You use the tools given to you to generate cold sales emails. ' +
            'You never generate sales emails yourself; you always use the tools. ' +
            'You try all 3 sales_agent tools once before choosing the best e-mail. ' +
            'You pick the single best email and use the sendEmail tool to send the best email only (and only the best email) to the user.',
        tools,
        model: 'gpt-4o-mini',
    })

    const inputText = await input({ prefill: 'editable', default: 'Send a cold sales email addressed to \'Dear CEO\'', message: 'Enter the prompt for the Sales Manager:' })

    await withTrace('Sales manager', async (trace) => {
        terminal.spinner.start()
        const managerResult = await run(salesManager, inputText)
        terminal.spinner.success()
        terminal.logMarkdown(dedent`
            ### Agent response
            ${managerResult.finalOutput}
        `)
        terminal.logTrace(trace)
    })
}

// Lab 3: Automated SDR with handoffs
export async function handoffWorkflow() {
    terminal.logMarkdown('## 🥼 Lab 2.3: Automated SDR with handoffs')

    const subjectInstructions = 'You can write a subject for a cold sales email. You are given a message and you need to write a subject for an email that is likely to get a response.'
    const htmlInstructions = 'You can convert a text email body to an HTML email body. You are given a text email body which might have some markdown and you need to convert it to an HTML email body with simple, clear, compelling layout and design.'
    const subjectWriter = new Agent({ name: 'Email subject writer', instructions: subjectInstructions, model: 'gpt-4o-mini' })
    const subjectTool = subjectWriter.asTool({ toolName: 'subject_writer', toolDescription: 'Write a subject for a cold sales email' })
    const htmlConverter = new Agent({ name: 'HTML email body converter', instructions: htmlInstructions, model: 'gpt-4o-mini' })
    const htmlTool = htmlConverter.asTool({ toolName: 'html_converter', toolDescription: 'Convert a text email body to an HTML email body' })

    const emailTools = [subjectTool, htmlTool, sendHTMLEmailTool]
    const emailerAgent = new Agent({
        name: 'Email Manager',
        instructions:
            'You are an email formatter and sender. You receive the body of an email to be sent. ' +
            'You first use the subject_writer tool to write a subject for the email, then use the html_converter tool to convert the body to HTML. ' +
            'Finally, you use the send_html_email tool to send the email with the subject and HTML body.' +
            'Use only the information you have about the recepient name and the email body to write the subject. Remove placeholders of not provided informations in the body ',
        tools: emailTools,
        model: 'gpt-4o-mini',
        handoffDescription: 'Convert an email to HTML and send it',

    })

    const salesManager = new Agent({
        name: 'Sales Manager',
        instructions:
            'You are a sales manager working for ComplAI. You use the tools given to you to generate cold sales emails. ' +
            'You never generate sales emails yourself; you always use the tools. ' +
            'You try all 3 sales agent tools at least once before choosing the best one. ' +
            'You can use the tools 3 times if you\'re not satisfied with the results from the first try. ' +
            'You select the single best one email (and only one) using your own judgement of which email will be most effective. ' +
            'After picking the email, you handoff the selected email to the Email Manager agent to format and send the email.',
        tools: salesTools,
        handoffs: [emailerAgent],
        model: 'gpt-4o-mini',
    })

    const inputText = await input({ prefill: 'editable', default: 'Send out a cold sales email addressed as \'Dear CEO\' from Alice of ACME Company.', message: 'Enter the prompt for the Sales Manager:' })

    const withTraceAndLog = async (name: string, fn: () => Promise<void>) => {
        try {
            await withTrace(name, async (trace) => {
                terminal.spinner.start(`Wait: ${terminal.renderTrace(trace)}`)
                await fn()
                if (terminal.spinner.isSpinning) terminal.spinner.success()
                terminal.logTrace(trace)
            })
        } catch (ex: any) {
            terminal.spinner.error(`Error: ${ex.message}`)
        }
    }

    await withTraceAndLog('Automated SDR', async () => {
        const automatedResult = await run(
            salesManager,
            inputText
        )
        terminal.logMarkdown(dedent`
            ### Agent response
            ${automatedResult.finalOutput}
        `)
    })
}