import { tool } from '@openai/agents'
import Terminal from '../terminal.ts'
import { z } from 'zod'
import { type Database } from 'better-sqlite3'

export const getSchemaTool = (db: Database) => tool({
    name: 'get_schema',
    description: 'Get the database schema (tables and columns)',
    parameters: z.object({}),
    async execute() {
        const sql = "SELECT sql FROM sqlite_master WHERE type IN ('table','view')"
        const rows: any[] = db
            .prepare(sql)
            .all()
        Terminal.spinner.push(Terminal.renderMarkdown('```sql\n' + sql + '\n```'))
        const schema = rows.map((r) => r.sql).join('\n')
        Terminal.spinner.push(Terminal.renderJSON(schema))
        return { schema }
    },
})

export const executeQueryTool = (db: Database) => tool({
    name: 'execute_query',
    description: 'Execute a SELECT SQL query on the database',
    parameters: z.object({ sql: z.string() }),
    async execute({ sql }) {
        const up = sql.trim().toUpperCase()
        if (!up.startsWith('SELECT')) throw new Error('Only SELECT queries are allowed')
        Terminal.spinner.push(Terminal.renderMarkdown('```sql\n' + sql + '\n```'))
        const rows: any[] = db.prepare(sql).all()
        Terminal.spinner.push(Terminal.renderMarkdown('```sql\n' + rows + '\n```'))
        return { rows }
    },
})