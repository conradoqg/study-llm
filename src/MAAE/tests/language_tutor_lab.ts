import { Agent, run } from '@openai/agents'
import { select, input } from '@inquirer/prompts'
import { dedent } from 'ts-dedent'
import Terminal from '../common/terminal.ts'
import { withTraceAndLog } from '../common/agentsExtensions.ts'
import { vocab } from '../common/vocab.ts'

export async function languageTutorLab() {
  Terminal.logMarkdown('## 🥼 Lab: Language-Learning Tutor')

  const tutorAgent = new Agent({
    name: 'Language Tutor',
    instructions: dedent`
      You evaluate user answers to vocabulary questions.
      When asked to evaluate an answer, if it's correct reply "Correct".
      If incorrect reply "Incorrect. The correct answer is <correct-answer>."
    `,
    model: 'gpt-4o-mini',
  })

  const language = await select<string>({
    message: 'Choose a target language:',
    choices: Object.keys(vocab),
  })
  const wordList = vocab[language] || []
  const roundsStr = await input({ message: 'Number of quiz questions:' })
  let rounds = parseInt(roundsStr) || 3
  if (rounds > wordList.length) rounds = wordList.length
  let score = 0

  // Randomize and pick words
  const shuffled = [...wordList]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  const selected = shuffled.slice(0, rounds)
  for (let i = 0; i < selected.length; i++) {
    const { word, meaning } = selected[i]
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
    const evalRes = await withTraceAndLog('Evaluate answer', () => run(tutorAgent, evalPrompt))
    const feedback = evalRes.finalOutput.trim()
    Terminal.logMarkdown(feedback)
    if (/correct/i.test(feedback)) score++
  }

  Terminal.logMarkdown(`**Quiz complete! You scored ${score} out of ${rounds}.**`)
}