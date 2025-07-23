import { Agent, run } from '@openai/agents'
import { input } from '@inquirer/prompts'
import { dedent } from 'ts-dedent'
import Terminal from '../common/terminal.ts'
import { withTraceAndLog } from '../common/agentsExtensions.ts'

export async function financialResearcher() {
    Terminal.logMarkdown('## Financial Researcher Crew')

    const company = await input({
        prefill: 'editable',
        default: 'Apple',
        message: 'Enter the company name to research:',
    })

    const researcher = new Agent({
        name: 'Researcher',
        instructions: dedent`
            You are a Senior Financial Researcher for ${company}.
            Research the company, news, and potential for ${company}.
            You're a seasoned financial researcher with a talent for finding the most relevant information about ${company}.
            Known for your ability to present findings in a clear and concise manner.
        `,
        model: 'gpt-4o-mini',
    })

    const researchOutput = await withTraceAndLog('Research', async () => {
        const prompt = dedent`
            Conduct thorough research on company ${company}. Focus on:
            1. Current company status and health
            2. Historical company performance
            3. Major challenges and opportunities
            4. Recent news and events
            5. Future outlook and potential developments

            Make sure to organize your findings in a structured format with clear sections.
        `
        const result = await run(researcher, prompt)
        return result.finalOutput
    })

    Terminal.logMarkdown('## Research Findings')
    Terminal.logMarkdown(researchOutput)

    const analyst = new Agent({
        name: 'Analyst',
        instructions: dedent`
            You are a Market Analyst and Report writer focused on ${company}.
            Analyze the research findings and create a comprehensive report on ${company}.
            Provide an executive summary, key insights, and a professional structure with clear headings.
        `,
        model: 'gpt-4o-mini',
    })

    const analysisOutput = await withTraceAndLog('Analysis', async () => {
        const prompt = dedent`
            Analyze the research findings and create a comprehensive report on ${company}. Your report should:
            1. Begin with an executive summary
            2. Include all key information from the research
            3. Provide insightful analysis of trends and patterns
            4. Offer a market outlook for ${company} (not for trading decisions)
            5. Be formatted in a professional, easy-to-read style with clear headings

            Research findings:
            ${researchOutput}
        `
        const result = await run(analyst, prompt)
        return result.finalOutput
    })

    Terminal.logMarkdown('## Final Report')
    Terminal.logMarkdown(analysisOutput)
}