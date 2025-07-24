import { tool, Agent, run } from '@openai/agents'
import { z } from 'zod'
import { input } from '@inquirer/prompts'
import { dedent } from 'ts-dedent'
import Terminal from '../common/terminal.ts'
import { withTraceAndLog } from '../common/agentsExtensions.ts'

export async function gitHubTriageLab() {
    Terminal.logMarkdown('## 🥼 Lab: GitHub Issue Triage Agent')

    // Tool: manage_issue
    const issueTool = tool({
        name: 'manage_issue',
        description: 'Create or comment on a GitHub issue',
        parameters: z.object({ errorLogs: z.string(), environment: z.string() }),
        async execute({ errorLogs, environment }) {
            // Stub: In a real lab this would call the GitHub API
            return { issueUrl: 'https://github.com/example/repo/issues/123' }
        },
    })

    const managerAgent = new Agent({
        name: 'Triage Manager',
        instructions: dedent`
            You are a triage manager. Use the manage_issue tool to create or update issues with reproducible steps.
            `,
        tools: [issueTool],
        model: 'gpt-4o-mini',
    })

    const errorLogs = await input({ message: 'Paste the error logs or description:' })
    const environment = await input({ message: 'Describe your environment (OS, versions):' })
    const prompt = JSON.stringify({ errorLogs, environment })
    const result = await withTraceAndLog('Triage GitHub issue', () => run(managerAgent, prompt))
    Terminal.logMarkdown(result.finalOutput)
}