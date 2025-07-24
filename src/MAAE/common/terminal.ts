import { marked, type MarkedExtension } from 'marked';
import { markedTerminal } from 'marked-terminal';
import terminalLink from 'terminal-link';
import colors from 'yoctocolors';
import { coloredJSONStringify } from 'colored-json-stringify';
import { Trace } from '@openai/agents';
import logSymbols from 'log-symbols';
import yoctoSpinner from './spinner.ts';

marked.use(markedTerminal() as MarkedExtension);

export default class Terminal {
    static renderMarkdown(text: string) {
        return (marked.parse(text) as string).trim() + '\n'
    }
    static logMarkdown(text: string) {
        console.log(Terminal.renderMarkdown(text))
    }
    static renderTrace(trace: Trace) {
        return `${logSymbols.info} Running ${colors.bold(trace.name)} (${terminalLink('trace', `https://platform.openai.com/logs/trace?trace_id=${trace.traceId}`)}).`
    }
    static logTrace(trace: Trace) {
        console.log(Terminal.renderTrace(trace))
    }
    static spinner = yoctoSpinner({ text: colors.bold('Wait..') })
    static renderJSON(obj: any) {
        return coloredJSONStringify(obj)
    }
    static async withSpinner<R>(text: string, fn: () => Promise<R>) {
        Terminal.spinner.start(colors.bold(text))
        let result: Awaited<R> = null
        try {
            result = await fn()
            Terminal.spinner.success()
        } catch (ex: any) {
            Terminal.spinner.error(`Error: ${ex.message}`)
            throw ex
        }
        return result
    }

    static logSymbols = logSymbols
}