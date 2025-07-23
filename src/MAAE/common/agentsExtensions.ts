import { OpenAIChatCompletionsModel, withTrace } from "@openai/agents"
import Terminal from "./terminal.ts"
import OpenAI from "openai"

export async function withTraceAndLog<R>(name: string, fn: () => Promise<R>) {
    let result: R = null
    await withTrace(name, async (trace) => {
        Terminal.logTrace(trace)
        result = await Terminal.withSpinner(`Wait`, fn)
    })
    return result
}

export function createOpenRouterModel(modelName: string) {
    const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
    const openrouterClient = new OpenAI({ apiKey: process.env.OPENROUTER_API_KEY, baseURL: OPENROUTER_BASE_URL })
    return new OpenAIChatCompletionsModel(openrouterClient, modelName)
}