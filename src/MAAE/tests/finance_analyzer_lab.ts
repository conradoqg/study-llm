import { tool, Agent, run } from '@openai/agents'
import { z } from 'zod'
import { readFile } from 'fs/promises'
import { input, confirm } from '@inquirer/prompts'
import { dedent } from 'ts-dedent'
import Terminal from '../common/terminal.ts'
import { withTraceAndLog } from '../common/agentsExtensions.ts'

export async function financeAnalyzerLab() {
    Terminal.logMarkdown('## 🥼 Lab: Personal Finance Analyzer')

    // Tool: parse_csv
    const parseTool = tool({
        name: 'parse_csv',
        description: 'Convert CSV file of transactions to JSON array',
        parameters: z.object({ filePath: z.string() }),
        async execute({ filePath }) {
            try {
                const text = await readFile(filePath, 'utf-8')
                const [header, ...lines] = text.split(/\r?\n/).filter(Boolean)
                const cols = header.split(',')
                const transactions = lines.map((line) => {
                    const vals = line.split(',')
                    const obj: Record<string, any> = {}
                    cols.forEach((col, i) => {
                        const v = vals[i]
                        obj[col] = isNaN(Number(v)) ? v : Number(v)
                    })
                    return obj
                })
                return { transactions }
            } catch {
                return { transactions: [] }
            }
        },
    })

    // Agent: finance analyst
    const analysisAgent = new Agent({
        name: 'Finance Analyst',
        instructions: dedent`
            You analyze financial transactions. Use the parse_csv tool to load data.
            Provide total spending and, if includeDetails is true, breakdown by category.
            `,
        tools: [parseTool],
        model: 'gpt-4o-mini',
    })

    const filePath = await input({ message: 'Path to transactions CSV:' })
    const includeDetails = await confirm({ message: 'Include category breakdown?' })
    const prompt = JSON.stringify({ filePath, includeDetails })

    const result = await withTraceAndLog('Analyze finance', () => run(analysisAgent, prompt))
    Terminal.logMarkdown(result.finalOutput)
}