import { Agent, run } from '@openai/agents'
import { select, input } from '@inquirer/prompts'
import { dedent } from 'ts-dedent'
import Terminal from '../common/terminal.ts'
import { withTraceAndLog } from '../common/agentsExtensions.ts'
import { dictionaryTool } from '../common/dictionaryTool.ts'

export async function languageTutorToolLab() {
  Terminal.logMarkdown('## 🥼 Lab: Language-Learning Tutor with Dictionary Tool')

  // Step 1: Agent decides how many questions to ask
  const plannerAgent = new Agent({
    name: 'Round Planner',
    instructions: dedent`
      You decide a random number of vocabulary questions for the quiz. Reply with a JSON object {"count": N}, where N is between 3 and 10.
    `,
    model: 'gpt-4o-mini',
  })
  const planRes = await withTraceAndLog(
    'Deciding number of questions',
    () => run(plannerAgent, 'Pick a random quiz length between 3 and 10')
  )
  let count = 5
  try {
    const parsed = JSON.parse(planRes.finalOutput)
    if (typeof parsed.count === 'number') count = parsed.count
  } catch {
    // fallback to default
  }
  Terminal.logMarkdown(`Quiz length: ${count} questions`)

  // Step 2: User selects language
  const languages = ['English', 'Spanish', 'French', 'German', 'Brazillian Portuguese', 'Japanese']
  const language = await select({ message: 'Choose a target language:', choices: languages })

  // Step 3: Load words and definitions via tool
  const dictRes = await dictionaryTool.invoke(null, JSON.stringify({ language, count }))
  const { entries }: { entries: Array<{ word: string; meaning: string }> } = dictRes as any

  // Step 4: Quiz loop
  let score = 0
  for (let i = 0; i < entries.length; i++) {
    const { word, meaning } = entries[i]
    Terminal.logMarkdown(`### Question ${i + 1}`)
    const question = `What is the meaning of the ${language} word '${word}'?`
    Terminal.logMarkdown(question)
    const answer = await input({ message: 'Your answer:' })
    const evalPrompt = dedent`
      Question: "${question}"
      User answer: "${answer}"
      Correct answer: "${meaning}"
      If the user answer matches the correct answer exactly, reply "Correct".
      Otherwise, reply "Incorrect. The correct answer is ${meaning}."
    `
    const evalRes = await withTraceAndLog('Evaluating answer', () => run(plannerAgent, evalPrompt))
    const feedback = evalRes.finalOutput.trim()
    Terminal.logMarkdown(feedback)
    if (/correct/i.test(feedback)) score++
  }
  Terminal.logMarkdown(`**Quiz complete! You scored ${score} out of ${entries.length}.**`)
}