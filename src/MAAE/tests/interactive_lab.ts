import { Agent, run, withTrace } from '@openai/agents'
import { input, select, confirm } from '@inquirer/prompts'
import { dedent } from 'ts-dedent'
import Terminal from '../common/terminal.ts'

function extractJSON(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  return match ? match[1].trim() : text.trim()
}

export async function interactiveLab() {
  Terminal.logMarkdown('## 🥼 Lab: Interactive Dynamics with AI and Inquirer')

  const interactiveAgent = new Agent({
    name: 'Interactive Agent',
    instructions: dedent`
      You are an interactive assistant. You will decide which prompts to ask the user and at the end which actions to perform.

      First, respond only with a JSON object containing a "prompts" array. Each prompt object should have:
      - "name": unique identifier for the prompt
      - "type": one of "input", "select", or "confirm"
      - "message": the prompt to show the user
      - "choices": an array of strings (required if type is "select")
      - "default": a default value (optional)

      After you receive the user's answers for these prompts, respond only with a JSON object containing an "actions" array. Each action object should have:
      - "type": currently only "log" is supported
      - "message": a string to log to the console (incorporate the user's answers directly, without placeholders)

      Respond with valid JSON only, without any additional text.
    `,
    model: 'gpt-4o-mini',
  })

  
  const configResult = await withTrace('Fetching prompts configuration', async (trace) => {
    const result = await Terminal.withSpinner('Fetching interaction config', () => run(interactiveAgent, 'Generate prompts configuration'))
    Terminal.logMarkdown('```json\n' + result.finalOutput + '\n```')
    Terminal.logTrace(trace)
    return result
  })

  const configJson = extractJSON(configResult.finalOutput)
  let config: any
  try {
    config = JSON.parse(configJson)
  } catch (err: any) {
    throw new Error('Failed to parse prompts configuration JSON: ' + err.message)
  }

  const answers: Record<string, any> = {}
  for (const prompt of config.prompts) {
    let answer: any
    const opts: any = { message: prompt.message }
    if (prompt.default !== undefined) opts.default = prompt.default
    switch (prompt.type) {
      case 'input':
        answer = await input(opts)
        break
      case 'select':
        answer = await select({ ...opts, choices: prompt.choices })
        break
      case 'confirm':
        answer = await confirm(opts)
        break
      default:
        throw new Error('Unsupported prompt type: ' + prompt.type)
    }
    answers[prompt.name] = answer
  }

  
  const actionResult = await withTrace('Fetching actions', async (trace) => {
    const result = await Terminal.withSpinner('Fetching actions', () => run(interactiveAgent, JSON.stringify({ answers })))
    Terminal.logMarkdown('```json\n' + result.finalOutput + '\n```')
    Terminal.logTrace(trace)
    return result
  })

  const actionJson = extractJSON(actionResult.finalOutput)
  let actionObj: any
  try {
    actionObj = JSON.parse(actionJson)
  } catch (err: any) {
    throw new Error('Failed to parse actions JSON: ' + err.message)
  }

  for (const action of actionObj.actions) {
    if (action.type === 'log') {
      Terminal.logMarkdown(action.message)
    } else {
      throw new Error('Unsupported action type: ' + action.type)
    }
  }
}