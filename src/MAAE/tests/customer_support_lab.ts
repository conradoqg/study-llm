import { Agent, run, withTrace } from '@openai/agents'
import { input, select, confirm } from '@inquirer/prompts'
import { dedent } from 'ts-dedent'
import Terminal from '../common/terminal.ts'

function extractJSON(text: string): string {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    return match ? match[1].trim() : text.trim()
}

export async function customerSupportLab() {
    Terminal.logMarkdown('## 🥼 Lab: Customer Support Ticket Assistant')

    const supportAgent = new Agent({
        name: 'Customer Support Agent',
        instructions: dedent`
            You are a customer support assistant. You will help the user create a support ticket by generating a series of prompts based on the user's needs.

            First, respond only with a JSON object containing a "prompts" array. Each prompt object should have:
            - "name": unique identifier for the prompt
            - "type": one of "input", "select", or "confirm"
            - "message": the text to display to the user
            - "choices": array of strings (required if type is "select")
            - "default": default value (optional)

            For this scenario:
            1. Ask the user what type of issue they are experiencing with a select prompt: one of "Technical Issue", "Billing Issue", or "General Inquiry".
            2. If they choose "Technical Issue", ask an input prompt for "errorDescription".
            3. If they choose "Billing Issue", ask an input prompt for "invoiceNumber".
            4. Ask a confirm prompt "Would you like to provide additional details?".
            5. If yes, ask an input prompt "additionalDetails".

            After collecting answers, respond only with a JSON object containing an "actions" array. Each action object should have:
            - "type": currently only "log"
            - "message": a summary of the ticket including all answers

            Respond with valid JSON only, without extra text.
            `,
        model: 'gpt-4o-mini',
    })

    const configResult = await withTrace('Fetch prompts config', async (trace) => {
        const result = await Terminal.withSpinner('Generating support prompts', () =>
            run(supportAgent, 'Generate support ticket prompts')
        )
        Terminal.logMarkdown('```json\n' + result.finalOutput + '\n```')
        Terminal.logTrace(trace)
        return result
    })

    const configJson = extractJSON(configResult.finalOutput)
    let config: any
    try {
        config = JSON.parse(configJson)
    } catch (err: any) {
        throw new Error('Failed to parse prompts configuration JSON: ' + err.message)
    }

    const answers: Record<string, any> = {}
    for (const prompt of config.prompts) {
        let answer: any
        const opts: any = { message: prompt.message }
        if (prompt.default !== undefined) opts.default = prompt.default
        switch (prompt.type) {
            case 'input':
                answer = await input(opts)
                break
            case 'select':
                answer = await select({ ...opts, choices: prompt.choices })
                break
            case 'confirm':
                answer = await confirm(opts)
                break
            default:
                throw new Error('Unsupported prompt type: ' + prompt.type)
        }
        answers[prompt.name] = answer
    }

    const actionResult = await withTrace('Fetch actions', async (trace) => {
        const result = await Terminal.withSpinner('Generating ticket summary', () =>
            run(supportAgent, JSON.stringify({ answers }))
        )
        Terminal.logMarkdown('```json\n' + result.finalOutput + '\n```')
        Terminal.logTrace(trace)
        return result
    })

    const actionJson = extractJSON(actionResult.finalOutput)
    let actionObj: any
    try {
        actionObj = JSON.parse(actionJson)
    } catch (err: any) {
        throw new Error('Failed to parse actions JSON: ' + err.message)
    }

    for (const action of actionObj.actions) {
        if (action.type === 'log') {
            Terminal.logMarkdown(action.message)
        } else {
            throw new Error('Unsupported action type: ' + action.type)
        }
    }
}