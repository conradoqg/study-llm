import { Agent, OpenAIChatCompletionsModel, run, withTrace } from '@openai/agents'
import { input } from '@inquirer/prompts'
import { dedent } from 'ts-dedent'
import Terminal from '../common/terminal.ts'
import { createOpenRouterModel, withTraceAndLog } from '../common/agentsExtensions.ts'

export async function debate() {
    const motion = await input({
        prefill: 'editable',
        message: 'Enter the debate motion:',
        default: 'There needs to be strict laws to regulate LLMs',
    })

    const debaterAgent = new Agent({
        name: 'Debater',
        instructions: dedent`
            You are a compelling debater.
            You have a knack for giving concise but convincing arguments.
        `,
        model: 'gpt-4o-mini',
    })

    const judgeAgent = new Agent({
        name: 'Judge',
        instructions: dedent`
            Decide the winner of the debate based on the arguments presented.
            You are a fair judge with a reputation for weighing up arguments without factoring in your own views, and making a decision purely on the merits of the arguments.
        `,
        model: createOpenRouterModel('anthropic/claude-3.7-sonnet'),
    })


    const proposeOutput = await withTraceAndLog('Propose', async () => {
        const prompt = dedent`
            You are proposing the motion: ${motion}.
            Come up with a clear argument in favor of the motion. Be very convincing.
        `
        const result = await run(debaterAgent, prompt)
        return result.finalOutput
    })
    Terminal.logMarkdown('## Propose')
    Terminal.logMarkdown(proposeOutput)


    const opposeOutput = await withTraceAndLog('Oppose', async () => {
        const prompt = dedent`
            You are in opposition to the motion: ${motion}.
            Come up with a clear argument against the motion. Be very convincing.
        `
        const result = await run(debaterAgent, prompt)
        return result.finalOutput
    })
    Terminal.logMarkdown('## Oppose ')
    Terminal.logMarkdown(opposeOutput)

    const decision = await withTraceAndLog('Decide', async () => {
        Terminal.spinner.start()
        const prompt = dedent`
            Review the arguments presented by the debaters and decide which side is more convincing.
            The motion is: ${motion}

            Pro (in favor):
            ${proposeOutput}

            Con (against):
            ${opposeOutput}
        `
        const result = await run(judgeAgent, prompt)
        return result.finalOutput
    })
    Terminal.logMarkdown('## Decision')
    Terminal.logMarkdown(decision)
}