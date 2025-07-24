import 'dotenv/config'
import { Agent, run } from '@openai/agents'
import { input } from '@inquirer/prompts'
import { dedent } from 'ts-dedent'
import Terminal from '../common/terminal.ts'
import { withTraceAndLog } from '../common/agentsExtensions.ts'
import Database from 'better-sqlite3'
import path from 'path'
import { getSchemaTool, executeQueryTool } from '../common/tool/sqlTool.ts'

export async function sqlGenerationLab() {
    Terminal.logMarkdown('## 🥼 Lab: End-to-End SQL Generation and Execution')

    const dbPath = path.join(import.meta.dirname, './dbs/chinook.sqlite')
    const db = new Database(dbPath)

    // Coordinator agent
    const sqlAgent = new Agent({
        name: 'SQL Assistant',
        instructions: dedent`
            You are a SQL assistant. Use the available tools to answer user queries:
            1. Call get_schema to inspect tables and columns.
            2. Formulate a valid SELECT SQL query that answers the user question, using only existing schema. Be aware of strings (use match instead of equal). Select titles and descriptions instead of IDs. Make the results user friendly and human readable. The result should relevante information about the question.
            3. Call execute_query with that SQL to get results.
            4. Present the query results to the user in JSON format.
            Only SELECT statements are allowed.
            `,
        tools: [getSchemaTool(db), executeQueryTool(db)],
        model: 'gpt-4o-mini',
    })

    // User interaction
    const userQuery = await input({
        prefill: 'editable',
        message: 'Enter your question about the data:',
        default: 'Which customers bought the track \'Balls to the Wall\' since 2010?'
    })
    const result = await withTraceAndLog('SQL query', () => run(sqlAgent, userQuery))
    Terminal.logMarkdown(result.finalOutput)
}