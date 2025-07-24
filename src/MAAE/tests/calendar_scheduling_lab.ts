import { tool, Agent, run } from '@openai/agents'
import { z } from 'zod'
import { input, select } from '@inquirer/prompts'
import { dedent } from 'ts-dedent'
import Terminal from '../common/terminal.ts'
import { withTraceAndLog } from '../common/agentsExtensions.ts'

export async function calendarSchedulingLab() {
  Terminal.logMarkdown('## 🥼 Lab: Calendar Scheduling Assistant')

  // Tool: check_slots
  const checkSlots = tool({
    name: 'check_slots',
    description: 'List free calendar slots for participants in a date range',
    parameters: z.object({ dateRange: z.string(), participants: z.string() }),
    async execute({ dateRange }) {
      const [startStr, endStr] = dateRange.split(' to ').map((s) => s.trim())
      const start = new Date(startStr)
      const end = new Date(endStr)
      const slots: string[] = []
      for (
        let d = new Date(start);
        d <= end;
        d.setDate(d.getDate() + 1)
      ) {
        const day = d.toISOString().slice(0, 10)
        slots.push(`${day} 10:00-11:00`, `${day} 14:00-15:00`)
      }
      return { slots }
    },
  })

  // Agent: meeting scheduler
  const schedulerAgent = new Agent({
    name: 'Meeting Scheduler',
    instructions: dedent`
      You are a meeting scheduler. Use the check_slots tool to retrieve available slots.
      Then select the best slot and confirm the meeting.
    `,
    tools: [checkSlots],
    model: 'gpt-4o-mini',
  })

  const title = await input({ message: 'Meeting title:' })
  const dateRange = await input({ message: 'Preferred date or range (e.g. 2025-08-01 to 2025-08-03):' })
  const participants = await input({ message: 'Participant emails (comma-separated):' })
  const prompt = JSON.stringify({ title, dateRange, participants })
  const result = await withTraceAndLog('Scheduling meeting', () => run(schedulerAgent, prompt))
  Terminal.logMarkdown(result.finalOutput)
}