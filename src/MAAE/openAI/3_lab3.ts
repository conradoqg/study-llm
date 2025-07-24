import terminal from '../common/terminal.ts'
import { Agent, run, withTrace, type InputGuardrail, type GuardrailFunctionOutput, type AgentOutputType, AgentsError, RunResult } from '@openai/agents'
import OpenAI from 'openai'
import { OpenAIChatCompletionsModel } from '@openai/agents'
import { z } from 'zod'
import { sendHTMLEmailTool } from '../common/tool/sendMailTool.ts'
import { dedent } from 'ts-dedent'
import { createOpenRouterModel, withTraceAndLog } from '../common/agentsExtensions.ts'

// Lab 3 covers: different models, structured outputs, and guardrails
// 3.0: Check API keys
export async function checkApiKeys() {
    terminal.logMarkdown('## 🥼 Lab 3.0: Check API keys')
    const openaiKey = process.env.OPENAI_API_KEY
    const openrouterKey = process.env.OPENROUTER_API_KEY
    if (openaiKey) terminal.logMarkdown(`OpenAI API Key exists and begins ${openaiKey.slice(0, 8)}`)
    else terminal.logMarkdown('OpenAI API Key not set')
    if (openrouterKey) terminal.logMarkdown(`OpenRouter API Key exists and begins ${openrouterKey.slice(0, 2)}`)
    else terminal.logMarkdown('OpenRouter API Key not set (and this is optional)')
}

// Shared setup for models and agents
const instructions1 = 'You are a sales agent working for ComplAI, a company that provides a SaaS tool for ensuring SOC2 compliance and preparing for audits, powered by AI. You write professional, serious cold emails.'
const instructions2 = 'You are a humorous, engaging sales agent working for ComplAI, a company that provides a SaaS tool for ensuring SOC2 compliance and preparing for audits, powered by AI. You write witty, engaging cold emails that are likely to get a response.'
const instructions3 = 'You are a busy sales agent working for ComplAI, a company that provides a SaaS tool for ensuring SOC2 compliance and preparing for audits, powered by AI. You write concise, to the point cold emails.'
const salesAgent1 = new Agent({ name: 'DeepSeek Sales Agent', instructions: instructions1, model: createOpenRouterModel('deepseek/deepseek-r1-0528') })
const salesAgent2 = new Agent({ name: 'Gemini Sales Agent', instructions: instructions2, model: createOpenRouterModel('google/gemini-2.5-flash') })
const salesAgent3 = new Agent({ name: 'Qwen Sales Agent', instructions: instructions3, model: createOpenRouterModel('qwen/qwen3-235b-a22b-07-25:free') })
const tool1 = salesAgent1.asTool({ toolName: 'sales_agent1', toolDescription: 'Write a cold sales email' })
const tool2 = salesAgent2.asTool({ toolName: 'sales_agent2', toolDescription: 'Write a cold sales email' })
const tool3 = salesAgent3.asTool({ toolName: 'sales_agent3', toolDescription: 'Write a cold sales email' })

// Lab 3.1: Different models demo
export async function differentModels() {
    terminal.logMarkdown('## 🥼 Lab 3.1: Different Models')
    const prompt = 'Write a cold sales email'
    const results = await withTraceAndLog('Different models', async () => {
        return Promise.all([
            run(salesAgent1, prompt),
            run(salesAgent2, prompt),
            run(salesAgent3, prompt),
        ])
    })
    const agents = [salesAgent1, salesAgent2, salesAgent3]
    agents.forEach((agent, i) => {
        terminal.logMarkdown(`### ${agent.name}\n${results[i].finalOutput}`)
    })
}

// Shared setup
const subjectInstructions = 'You can write a subject for a cold sales email. You are given a message and you need to write a subject for an email that is likely to get a response.'
const htmlInstructions = 'You can convert a text email body to an HTML email body. You are given a text email body which might have some markdown and you need to convert it to an HTML email body with simple, clear, compelling layout and design.'
const subjectWriter = new Agent({ name: 'Email subject writer', instructions: subjectInstructions, model: 'gpt-4o-mini' })
const subjectTool = subjectWriter.asTool({ toolName: 'subject_writer', toolDescription: 'Write a subject for a cold sales email' })
const htmlConverter = new Agent({ name: 'HTML email body converter', instructions: htmlInstructions, model: 'gpt-4o-mini' })
const htmlTool = htmlConverter.asTool({ toolName: 'html_converter', toolDescription: 'Convert a text email body to an HTML email body' })
const emailTools = [subjectTool, htmlTool, sendHTMLEmailTool]
const emailerAgent = new Agent({
    name: 'Email Manager',
    instructions: dedent`
        You are an email formatter and sender. 
        You receive the body of an email to be sent. 
        You first use the subject_writer tool to write a subject for the email, then use the html_converter tool to convert the body to HTML. 
        Finally, you use the send_email tool to send the email with the subject and HTML body.`,
    tools: emailTools,
    model: 'gpt-4o-mini',
    handoffDescription: 'Convert an email to HTML and send it',
})
const salesManagerInstructions = dedent`
    You are a sales manager working for ComplAI.' +
    You use the tools given to you to generate cold sales emails. 
    You never generate sales emails yourself; you always use the tools. 
    You try all 3 sales agent tools at least once before choosing the best one. 
    You can use the tools a few times if you\'re not satisfied with the results from the first try. 
    You select the single best email using your own judgement of which email will be most effective. 
    After picking the email, you handoff to the Email Manager agent to format and send the email.`

// Lab 3.2: Sales Manager with handoffs
export async function toolHandoffWorkflow() {
    terminal.logMarkdown('## 🥼 Lab 3.2: Sales Manager with Handoffs')

    const salesManager = new Agent({
        name: 'Sales Manager',
        instructions: salesManagerInstructions,
        tools: [tool1, tool2, tool3],
        handoffs: [emailerAgent],
        model: 'gpt-4o-mini',
    })

    const message = 'Send out a cold sales email addressed to Dear CEO from Alice of ACME Company.'
    const result = await withTraceAndLog('Automated SDR', async () => {
        return run(salesManager, message)
    })
    terminal.logMarkdown(`### Agent response\n${result.finalOutput}`)
}

// Lab 3.3: Guardrails demo
export async function guardrailWorkflow() {
    terminal.logMarkdown('## 🥼 Lab 3.3: Guardrails')

    const NameCheckOutputSchema = z.object({ is_name_in_message: z.boolean(), name: z.string() })
    type NameCheckOutput = z.infer<typeof NameCheckOutputSchema>
    const guardrailAgent = new Agent<{}, AgentOutputType<NameCheckOutput>>({
        name: 'Name check',
        instructions: 'Check if the user is including someone\'s personal name in what they want you to do.',
        outputType: NameCheckOutputSchema,
        model: 'gpt-4o-mini',
    })
    const guardrailAgainstName: InputGuardrail = {
        name: 'name_check',
        execute: async ({ input }) => {
            const message = typeof input === 'string' ? input : ''
            const result = await run(guardrailAgent, message)
            const output = result.finalOutput as NameCheckOutput
            return { tripwireTriggered: output.is_name_in_message, outputInfo: output } as GuardrailFunctionOutput
        }
    }
    const carefulSalesManager = new Agent({
        name: 'Sales Manager',
        instructions: salesManagerInstructions,
        tools: [tool1, tool2, tool3],
        handoffs: [emailerAgent],
        inputGuardrails: [guardrailAgainstName],
        model: 'gpt-4o-mini',
    })

    const safeMessage = 'Send out a cold sales email addressed to Dear CEO from Head of Business Development'
    const result = await withTraceAndLog('Protected Automated SDR - allowed', async () => {
        return run(carefulSalesManager, safeMessage)
    })
    terminal.logMarkdown(`### Agent response\n${result.finalOutput}`)

    const blockedMessage = 'Send out a cold sales email addressed to Dear CEO from Alice'
    terminal.logMarkdown('### Now with name guardrail violation')
    try {
        await withTraceAndLog('Protected Automated SDR - blocked', async () => {
            await run(carefulSalesManager, blockedMessage)
        })
    } catch (ex: any) {
        // Do nothing
    }
}