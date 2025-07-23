import Terminal from './common/terminal.ts'
import { Agent, run, webSearchTool } from '@openai/agents'
import { withTrace, type AgentOutputType, type ModelSettings } from '@openai/agents-core'
import { input } from '@inquirer/prompts'
import { z } from 'zod'
import { sendHTMLEmailTool } from './common/sendMailTool.ts'
import { dedent } from 'ts-dedent'
import { withTraceAndLog } from './common/agentsExtensions.ts'

// Lab 4: Deep Research with Web Search, Structured Outputs, and Automated Pipeline

// 4.1: Hosted Web Search demo
const searchInstructions = dedent`
  You are a research assistant. Given a search term, you search the web for that term and
  produce a concise summary of the results. The summary must be 2-3 paragraphs and less than 300
  words. Capture the main points. Write succinctly, no need to have complete sentences or good
  grammar. This will be consumed by someone synthesizing a report, so it's vital you capture the
  essence and ignore any fluff. Do not include any additional commentary other than the summary itself.
`

const searchAgent = new Agent({
    name: 'Search Agent',
    instructions: searchInstructions,
    tools: [webSearchTool({ searchContextSize: 'low' })],
    model: 'gpt-4o-mini',
    modelSettings: { toolChoice: 'required' } as ModelSettings,
})
export async function hostedSearchWorkflow() {
    Terminal.logMarkdown('## 🥼 Lab 4.1: Hosted Web Search')

    const query = await input({ prefill: 'editable', message: 'Enter search term:', default: 'Latest AI Agent frameworks in 2025' })

    const result = await withTraceAndLog('Web Search', async () => {
        return run(searchAgent, query)
    })

    Terminal.logMarkdown(result.finalOutput)
}

// 4.2: Structured search planning demo
const HOW_MANY_SEARCHES = 3
const planInstructions = dedent`
  You are a helpful research assistant. Given a query, come up with a set of web searches
  to perform to best answer the query. Output ${HOW_MANY_SEARCHES} terms to query for.
`
const WebSearchItemSchema = z.object({
    reason: z.string().describe('Your reasoning for why this search is important to the query.'),
    query: z.string().describe('The search term to use for the web search.'),
})
const WebSearchPlanSchema = z.object({
    searches: z.array(WebSearchItemSchema).describe('A list of web searches to perform to best answer the query.'),
})
type WebSearchPlan = z.infer<typeof WebSearchPlanSchema>
const plannerAgent = new Agent<unknown, AgentOutputType<WebSearchPlan>>({
    name: 'Planner Agent',
    instructions: planInstructions,
    model: 'gpt-4o-mini',
    outputType: WebSearchPlanSchema,
})
export async function structuredSearchWorkflow() {
    Terminal.logMarkdown('## 🥼 Lab 4.2: Plan Web Searches (Structured Outputs)')

    const query = await input({ prefill: 'editable', message: 'Enter query to plan searches:', default: 'Latest AI Agent frameworks in 2025' })

    const plan = await withTraceAndLog('Plan Searches', async () => {
        const result = await run(plannerAgent, query)
        return result.finalOutput as WebSearchPlan
    })

    Terminal.logMarkdown(dedent`
        ### Planned Searches
        
        ${Terminal.renderJSON(plan)}    
    `)
}

// 4.3: End-to-End Deep Research workflow
const emailInstructions = dedent`
  You are able to send a nicely formatted HTML email based on a detailed report.
  You will be provided with a detailed report. You should use your tool to send one email, providing the
  report converted into clean, well presented HTML with an appropriate subject line.
`
const emailAgent = new Agent({
    name: 'Email Agent',
    instructions: emailInstructions,
    tools: [sendHTMLEmailTool],
    model: 'gpt-4o-mini',
})
const reportInstructions = dedent`
  You are a senior researcher tasked with writing a cohesive report for a research query.
  You will be provided with the original query, and some initial research done by a research assistant.
  You should first come up with an outline for the report that describes the structure and flow of the report.
  Then, generate the report and return that as your final output.
  The final output should be in markdown format, and it should be lengthy and detailed. Aim for 5-10 pages of content, at least 1000 words.
`
const ReportDataSchema = z.object({
    short_summary: z.string().describe('A short 2-3 sentence summary of the findings.'),
    markdown_report: z.string().describe('The final report'),
    follow_up_questions: z.array(z.string()).describe('Suggested topics to research further'),
})
type ReportData = z.infer<typeof ReportDataSchema>
const writerAgent = new Agent<unknown, AgentOutputType<ReportData>>({
    name: 'Writer Agent',
    instructions: reportInstructions,
    model: 'gpt-4o-mini',
    outputType: ReportDataSchema,
})
export async function deepResearchWorkflow() {
    Terminal.logMarkdown('## 🥼 Lab 4.3: End-to-End Deep Research')

    const query = await input({ prefill: 'editable', message: 'Enter research query:', default: 'Latest AI Agent frameworks in 2025' })

    await withTrace('Deep Research', async (trace) => {
        Terminal.logTrace(trace)

        Terminal.spinner.info('Planning searches...')
        const plan = await Terminal.withSpinner('Planning searches...', async () => {
            const planResult = await run(plannerAgent, query)
            return planResult.finalOutput as WebSearchPlan
        })

        Terminal.logMarkdown(dedent`
            ### Plan
            ${Terminal.renderJSON(plan)}
            `)

        const searchResults = await Terminal.withSpinner('Performing searches...', async () => {
            const promises = plan.searches.map(item => run(searchAgent, `Search term: ${item.query}\nReason for searching: ${item.reason}`))
            const responses = await Promise.all(promises)
            return responses.map(r => r.finalOutput)
        })

        searchResults.forEach((r, i) => {
            Terminal.logMarkdown(dedent`
                ### Search ${i + 1}: ${plan.searches[i].query}
                ${r}
            `)
        })

        const report = await Terminal.withSpinner('Writing report...', async () => {
            const reportResult = await run(writerAgent, `Original query: ${query}\nSummarized search results: ${JSON.stringify(searchResults)}`)
            return reportResult.finalOutput as ReportData
        })

        Terminal.logMarkdown(dedent`
            ### Short summary
            ${report.short_summary}

            ### Report
            \`\`\`markdown
            ${report.markdown_report}
            \`\`\`

            ### Follow-up questions
            ${report.follow_up_questions.map(q => `- ${q}`).join('\n')}
            `)

        const emailRes = await Terminal.withSpinner('Sending email...', async () => {
            return run(emailAgent, report.markdown_report)
        })
    })
}