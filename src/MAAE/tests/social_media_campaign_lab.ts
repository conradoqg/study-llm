import { tool, Agent, run } from '@openai/agents'
import { z } from 'zod'
import { input, select } from '@inquirer/prompts'
import { dedent } from 'ts-dedent'
import Terminal from '../common/terminal.ts'
import { withTraceAndLog } from '../common/agentsExtensions.ts'

export async function socialMediaCampaignLab() {
    Terminal.logMarkdown('## 🥼 Lab: Social Media Campaign Manager')

    // Tool: schedule_post
    const scheduleTool = tool({
        name: 'schedule_post',
        description: 'Schedule social media posts for a given theme and platform',
        parameters: z.object({ theme: z.string(), platform: z.string(), postCount: z.string() }),
        async execute({ theme, platform, postCount }) {
            const count = parseInt(postCount) || 1
            const scheduledPosts: Array<{ text: string; scheduledFor: string }> = []
            const now = new Date()
            for (let i = 0; i < count; i++) {
                const scheduled = new Date(now.getTime() + (i + 1) * 3600 * 1000)
                scheduledPosts.push({
                    text: `${theme} (post ${i + 1})`,
                    scheduledFor: scheduled.toISOString(),
                })
            }
            return { scheduledPosts }
        },
    })

    // Agent: campaign manager
    const campaignAgent = new Agent({
        name: 'Campaign Manager',
        instructions: dedent`
            You create a series of social media posts. Use the schedule_post tool to schedule each post.
            `,
        tools: [scheduleTool],
        model: 'gpt-4o-mini',
    })

    const theme = await input({ message: 'Campaign theme or topic:' })
    const platforms = await select({
        message: 'Select platforms to post:',
        choices: ['Twitter', 'LinkedIn', 'Facebook', 'Instagram'],
    })
    const postCount = await input({ message: 'Number of posts to generate:' })
    const prompt = JSON.stringify({ theme, platform: platforms, postCount })
    const result = await withTraceAndLog('Manage social campaign', () => run(campaignAgent, prompt))
    Terminal.logMarkdown(result.finalOutput)
}