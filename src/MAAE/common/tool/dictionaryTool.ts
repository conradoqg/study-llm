import { tool } from '@openai/agents'
import { promises as fs } from 'fs'
import path from 'path'
import { z } from 'zod'

// Tool to fetch and cache a list of words and definitions for a given language
export const dictionaryTool = tool({
    name: 'load_dictionary',
    description: 'Fetch and cache common words with definitions for a given language',
    parameters: z.object({ language: z.string(), count: z.number().min(1).max(20) }),
    async execute({ language, count }) {
        const codeMap: Record<string, string> = {
            English: 'en',
            Spanish: 'es',
            French: 'fr',
            German: 'de',
            'Brazillian Portuguese': 'pt',
            Japanese: 'ja',
        }
        const code = codeMap[language] || 'en'
        const cacheDir = path.resolve('.cache')
        await fs.mkdir(cacheDir, { recursive: true })
        const listPath = path.join(cacheDir, `words_${code}.txt`)
        let words: string[]
        try {
            const txt = await fs.readFile(listPath, 'utf-8')
            words = txt.split('\n').filter(Boolean)
        } catch {
            const url = `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2016/${code}/${code}_50k.txt`
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
        const entries: Array<{ word: string; meaning: string }> = []
        for (const w of selection) {
            let meaning = ''
            try {
                const defUrl = `https://api.dictionaryapi.dev/api/v2/entries/${code}/${encodeURIComponent(w)}`
                const defRes = await fetch(defUrl)
                if (defRes.ok) {
                    const data = await defRes.json()
                    meaning = data[0]?.meanings[0]?.definitions[0]?.definition || ''
                }
            } catch {
                meaning = ''
            }
            entries.push({ word: w, meaning })
        }
        return { entries }
    },
})