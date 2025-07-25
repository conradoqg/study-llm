import { Agent, run } from '@openai/agents'
import { select, input } from '@inquirer/prompts'
import { dedent } from 'ts-dedent'
import { withTraceAndLog } from '../common/agentsExtensions.ts'
import { tool } from '@openai/agents'
import { promises as fs } from 'fs'
import path from 'path'
import { z } from 'zod'
import Terminal from '../common/terminal.ts';

const loadWordsSchema = z.object({
    languageCode: z.string().describe(`ISO 639-1 language code.`),
    count: z.number().min(1).max(20).describe(`Number of words to fetch.`)
})

const selectedWordsSchema = z.object({
    words: z.array(z.string())
})

// Tool to fetch and cache a list of words and definitions for a given language
export const dictionaryTool = tool({
    name: 'load_words',
    description: 'Fetch N common words with definitions for a given language code',
    parameters: loadWordsSchema,
    async execute({ languageCode, count }: z.infer<typeof loadWordsSchema>) {
        Terminal.spinner.push(Terminal.renderMarkdown(`## Tool dictionaryTool->load_words`))
        Terminal.spinner.push(Terminal.renderMarkdown(`Creating ${count} words for ${languageCode}`))

        const normalizedLanguageCode = languageCode.replace('-', '_').toLocaleLowerCase()

        const cacheDir = path.resolve('.cache')
        await fs.mkdir(cacheDir, { recursive: true })
        const listPath = path.join(cacheDir, `words_${normalizedLanguageCode}.txt`)
        let words: string[]
        try {
            Terminal.spinner.push('Cached')
            const txt = await fs.readFile(listPath, 'utf-8')
            words = txt.split('\n').filter(Boolean)
        } catch {
            Terminal.spinner.push('Fetching')
            const url = `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2016/${normalizedLanguageCode}/${normalizedLanguageCode}_50k.txt`
            const res = await fetch(url)
            if (!res.ok) throw new Error(`Failed to fetch word list: ${res.status}`)
            const body = await res.text()
            words = body
                .split('\n')
                .map((line) => line.split(' ')[0])
                .filter(Boolean)
            await fs.writeFile(listPath, words.join('\n'), 'utf-8')
        }
        // Shuffle words
        for (let i = words.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
                ;[words[i], words[j]] = [words[j], words[i]]
        }
        const selection = words.slice(0, count)

        Terminal.spinner.push(Terminal.renderMarkdown('Selected words:'))
        Terminal.spinner.push(Terminal.renderJSON(selection))

        return { selection }
    },
})

export async function languageTutorToolLab() {
    Terminal.logMarkdown('## 🥼 Lab: Language-Learning Tutor with Dictionary Tool')

    // Step 1: Agent decides how many questions to ask
    const plannerAgent = new Agent({
        name: 'Round Planner',
        instructions: dedent`
            You decide a random number of vocabulary questions for the quiz. Reply with a JSON object {"count": N}, where N is between 3 and 10.
            `,
        model: 'gpt-4o-mini'
    })
    const planRes = await withTraceAndLog('Deciding number of questions', () => run(plannerAgent, 'Pick a random quiz length between 3 and 10'))

    let count = 5
    try {
        const parsed = JSON.parse(planRes.finalOutput)
        if (typeof parsed.count === 'number') count = parsed.count
    } catch {
        // fallback to default
    }
    Terminal.logMarkdown(`Quiz length: ${count} questions`)

    // Step 2: User selects language
    const languages = ['English', 'Spanish', 'French', 'German', 'Brazilian Portuguese', 'Japanese']
    const language = await select({ message: 'Choose a target language:', choices: languages })

    // Step 3: Load words via tool
    const wordChooser = new Agent({
        name: 'Words Fetcher',
        instructions: dedent`
            You fetch N random words from a dictionary trough the load_dictionary tool.
            `,
        tools: [dictionaryTool],
        model: 'gpt-4o-mini',
        outputType: selectedWordsSchema
    })

    const result = await run(wordChooser, `Fetch ${count} words for '${language}'`)
    const dictRes = result.finalOutput.words

    // Step 4: Quiz loop
    const tutorAgent = new Agent({
        name: 'Language Tutor',
        instructions: dedent`
            You evaluate user answers to vocabulary questions.
            When asked to evaluate an answer, if it's has the correct dictionary meaning reply "Correct".
            If incorrect reply "Incorrect. The correct answer is <correct-meaning>."
            `,
        model: 'gpt-4o-mini',
    })

    let score = 0
    for (let i = 0; i < dictRes.length; i++) {
        const word = dictRes[i]
        Terminal.logMarkdown(`### Question ${i + 1}`)
        const question = `What is the dictionary meaning of the ${language} word '${word}'?`
        Terminal.logMarkdown(question)
        const answer = await input({ message: 'Your answer:' })
        const evalPrompt = dedent`
            Question: "${question}"
            User answer: "${answer}"
            
            Evaluate
            `
        const evalRes = await withTraceAndLog('Evaluating answer', () => run(tutorAgent, evalPrompt))
        const feedback = evalRes.finalOutput.trim()
        Terminal.logMarkdown(feedback)
        if (!/incorrect/i.test(feedback)) score++
    }
    Terminal.logMarkdown(`**Quiz complete! You scored ${score} out of ${dictRes.length}.**`)
}