import { Agent, run } from '@openai/agents'
import { input, select, confirm } from '@inquirer/prompts'
import { dedent } from 'ts-dedent'
import Terminal from '../common/terminal.ts'

export async function customerSupportConversationalLab() {
    Terminal.logMarkdown('## 🥼 Lab: Conversational Customer Support Ticket Assistant')

    const convAgent = new Agent({
        name: 'Friendly Support Agent',
        instructions: dedent`
            You are a friendly and empathetic customer support assistant. Engage the user in a conversational manner.
            After each user input, acknowledge their response and ask the next relevant question.
            When all necessary information has been gathered, provide a concise summary of the support ticket.
            `,
        model: 'gpt-4o-mini',
    })

    // Initial greeting
    const intro = await run(convAgent, 'Welcome')
    Terminal.logMarkdown(intro.finalOutput)

    const answers: Record<string, any> = {}

    // Step 1: Issue type
    const issueType = await select({
        message: 'What type of issue are you experiencing?',
        choices: ['Technical Issue', 'Billing Issue', 'General Inquiry'],
    })
    answers.issueType = issueType
    const resp1 = await run(convAgent, `User: I am experiencing a ${issueType}.`)
    Terminal.logMarkdown(resp1.finalOutput)

    // Step 2: Conditional follow-up
    if (issueType === 'Technical Issue') {
        const errorDescription = await input({ message: 'Please describe the technical issue you are experiencing:' })
        answers.errorDescription = errorDescription
        const resp2 = await run(convAgent, `User: ${errorDescription}`)
        Terminal.logMarkdown(resp2.finalOutput)
    } else if (issueType === 'Billing Issue') {
        const invoiceNumber = await input({ message: 'Please provide your invoice number:' })
        answers.invoiceNumber = invoiceNumber
        const resp2 = await run(convAgent, `User: My invoice number is ${invoiceNumber}.`)
        Terminal.logMarkdown(resp2.finalOutput)
    } else {
        const inquiryDescription = await input({ message: 'Please describe your inquiry:' })
        answers.inquiryDescription = inquiryDescription
        const resp2 = await run(convAgent, `User: ${inquiryDescription}`)
        Terminal.logMarkdown(resp2.finalOutput)
    }

    // Step 3: Additional details
    const wantsMore = await confirm({ message: 'Would you like to provide additional details?' })
    answers.wantsMore = wantsMore
    const resp3 = await run(convAgent, `User: ${wantsMore ? 'Yes, I have more details.' : 'No, that is all.'}`)
    Terminal.logMarkdown(resp3.finalOutput)

    // Step 4: Additional details if requested
    if (wantsMore) {
        const additionalDetails = await input({ message: 'Please enter any additional details:' })
        answers.additionalDetails = additionalDetails
        const resp4 = await run(convAgent, `User: ${additionalDetails}`)
        Terminal.logMarkdown(resp4.finalOutput)
    }

    // Final summary
    const summaryPrompt = dedent`
            Summarize the support ticket based on these details:
            ${Object.entries(answers)
            .map(([k, v]) => `- ${k}: ${v}`)
            .join('\n')}
        `
    const finalResp = await run(convAgent, summaryPrompt)
    Terminal.logMarkdown(finalResp.finalOutput)
}