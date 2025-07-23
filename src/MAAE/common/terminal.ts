import { marked, type MarkedExtension } from 'marked';
import { markedTerminal } from 'marked-terminal';
import yoctoSpinner from 'yocto-spinner';
import terminalLink from 'terminal-link';
import colors from 'yoctocolors';
import { coloredJSONStringify } from 'colored-json-stringify';
import { Trace } from '@openai/agents';

marked.use(markedTerminal() as MarkedExtension);

export default class Terminal {
    static renderMarkdown(text: string) {
        return (marked.parse(text) as string).trim() + '\n'
    }
    static logMarkdown(text: string) {
        console.log(Terminal.renderMarkdown(text))
    }
    static renderTrace(trace: Trace) {
        return `👓 Check the ${colors.bold(terminalLink('trace', `https://platform.openai.com/logs/trace?trace_id=${trace.traceId}`))}.`
    }
    static logTrace(trace: Trace) {
        console.log(Terminal.renderTrace(trace))
    }
    static spinner = yoctoSpinner({ text: colors.bold('Wait..') })
    static renderJSON(obj: any) {
        return coloredJSONStringify(obj)
    }
}