import { Agent, run, withTrace } from '@openai/agents'
import terminal from './common/terminal.ts'

export async function tellJoke() {
    terminal.logMarkdown('## 🥼 Lab 1: Tell a joke')
    const agent = new Agent({
        name: 'Jokester',
        instructions: 'You are a joke teller',
        model: 'gpt-4o-mini',
    })
    await withTrace('Telling a joke', async (trace) => {
        terminal.spinner.start()
        const result = await run(agent, 'Tell a joke about Autonomous AI Agents')
        terminal.spinner.success()
        terminal.logMarkdown(result.finalOutput)
        terminal.logTrace(trace)
    })
}