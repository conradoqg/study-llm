import { withTrace } from "@openai/agents"
import Terminal from "./terminal.ts"

export async function withTraceAndLog<R>(name: string, fn: () => Promise<R>) {
    let result: R = null
    await withTrace(name, async (trace) => {
        Terminal.logTrace(trace)
        result = await Terminal.withSpinner(`Wait`, fn)
    })
    return result
}