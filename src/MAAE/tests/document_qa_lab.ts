import { tool, Agent, run } from '@openai/agents'
import { z } from 'zod'
import { input } from '@inquirer/prompts'
import { dedent } from 'ts-dedent'
import Terminal from '../common/terminal.ts'
import { withTraceAndLog } from '../common/agentsExtensions.ts'

// Sample documents
const sampleDocs: Record<string, string> = {
  'doc1':
    'Cats are small, carnivorous mammals. They are valued by humans for companionship and their ability to hunt rodents.',
  'doc2':
    'JavaScript is a programming language that conforms to the ECMAScript specification. It is high-level and supports multiple programming paradigms.',
}

export async function documentQALab() {
  Terminal.logMarkdown('## 🥼 Lab: Document Q&A with Retrieval')

  // Tool: search_doc
  const searchTool = tool({
    name: 'search_doc',
    description: 'Retrieve relevant passages from a document',
    parameters: z.object({ documentPath: z.string(), question: z.string() }),
    async execute({ documentPath, question }) {
      const content = sampleDocs[documentPath] || ''
      // Return first sentence as a passage
      const passages = content.split('.').map((s) => s.trim()).filter(Boolean)
      return { passages }
    },
  })

  // Agent: Q&A assistant
  const qaAgent = new Agent({
    name: 'QA Assistant',
    instructions: dedent`
      You are a Q&A assistant. Use the search_doc tool to fetch passages and answer the question concisely.
    `,
    tools: [searchTool],
    model: 'gpt-4o-mini',
  })

  const documentPath = await input({ message: 'Document ID (e.g. doc1):' })
  const question = await input({ message: 'Enter your question about the document:' })
  const prompt = JSON.stringify({ documentPath, question })
  const result = await withTraceAndLog('Document Q&A', () => run(qaAgent, prompt))
  Terminal.logMarkdown(result.finalOutput)
}