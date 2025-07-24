import process from 'node:process';
import { stripVTControlCharacters } from 'node:util';
import yoctocolors from 'yoctocolors';
import { type Writable } from 'node:stream';

const isUnicodeSupported = process.platform !== 'win32'
    || Boolean(process.env.WT_SESSION) // Windows Terminal
    || process.env.TERM_PROGRAM === 'vscode';

const isInteractive = stream => Boolean(
    stream.isTTY
    && process.env.TERM !== 'dumb'
    && !('CI' in process.env),
);

const infoSymbol = yoctocolors.blue(isUnicodeSupported ? 'ℹ' : 'i');
const successSymbol = yoctocolors.green(isUnicodeSupported ? '✔' : '√');
const warningSymbol = yoctocolors.yellow(isUnicodeSupported ? '⚠' : '‼');
const errorSymbol = yoctocolors.red(isUnicodeSupported ? '✖' : '×');

const defaultSpinner = {
    frames: isUnicodeSupported
        ? [
            '⠋',
            '⠙',
            '⠹',
            '⠸',
            '⠼',
            '⠴',
            '⠦',
            '⠧',
            '⠇',
            '⠏',
        ]
        : [
            '-',
            '\\',
            '|',
            '/',
        ],
    interval: 80,
};

class YoctoSpinner {
    #frames;
    #interval;
    #currentFrame = -1;
    #timer;
    #text;
    #stream;
    #color;
    #lines = 0;
    #exitHandlerBound;
    #isInteractive;
    #lastSpinnerFrameTime = 0;
    #isSpinning = false;

    constructor(options: Options = {}) {
        const spinner = options.spinner ?? defaultSpinner;
        this.#frames = spinner.frames;
        this.#interval = spinner.interval;
        this.#text = options.text ?? '';
        this.#stream = options.stream ?? process.stderr;
        this.#color = options.color ?? 'cyan';
        this.#isInteractive = isInteractive(this.#stream);
        this.#exitHandlerBound = this.#exitHandler.bind(this);
    }

    start(text?: string) {
        if (text) {
            this.#text = text;
        }

        if (this.isSpinning) {
            return this;
        }

        this.#isSpinning = true;
        this.#hideCursor();
        this.#render();
        this.#subscribeToProcessEvents();

        // Only start the timer in interactive mode
        if (this.#isInteractive) {
            this.#timer = setInterval(() => {
                this.#render();
            }, this.#interval);
        }

        return this;
    }

    stop(finalText?: string) {
        if (!this.isSpinning) {
            return this;
        }

        this.#isSpinning = false;
        if (this.#timer) {
            clearInterval(this.#timer);
            this.#timer = undefined;
        }

        this.#showCursor();
        this.clear();
        this.#unsubscribeFromProcessEvents();

        if (finalText) {
            this.#stream.write(`${finalText}\n`);
        }

        return this;
    }

    #symbolStop(symbol: string, text?: string) {
        return this.stop(`${symbol} ${text ?? this.#text}`);
    }

    success(text?: string) {
        return this.#symbolStop(successSymbol, text);
    }

    error(text?: string) {
        return this.#symbolStop(errorSymbol, text);
    }

    warning(text?: string) {
        return this.#symbolStop(warningSymbol, text);
    }

    info(text?: string) {
        return this.#symbolStop(infoSymbol, text);
    }

    push(text) {
        if (!this.isSpinning) {
            this.#stream.write(text + '\n');
            return this
        }

        this.clear();
        this.#stream.write(text + '\n');
        this.#render();
        return this;
    }

    get isSpinning() {
        return this.#isSpinning;
    }

    get text() {
        return this.#text;
    }

    set text(value: string) {
        this.#text = value ?? '';
        this.#render();
    }

    get color() {
        return this.#color;
    }

    set color(value) {
        this.#color = value;
        this.#render();
    }

    clear() {
        if (!this.#isInteractive) {
            return this;
        }

        this.#stream.cursorTo(0);

        for (let index = 0; index < this.#lines; index++) {
            if (index > 0) {
                this.#stream.moveCursor(0, -1);
            }

            this.#stream.clearLine(1);
        }

        this.#lines = 0;

        return this;
    }

    #render() {
        // Ensure we only update the spinner frame at the wanted interval,
        // even if the frame method is called more often.
        const now = Date.now();
        if (this.#currentFrame === -1 || now - this.#lastSpinnerFrameTime >= this.#interval) {
            this.#currentFrame = ++this.#currentFrame % this.#frames.length;
            this.#lastSpinnerFrameTime = now;
        }

        const applyColor = yoctocolors[this.#color] ?? yoctocolors.cyan;
        const frame = this.#frames[this.#currentFrame];
        let string = `${applyColor(frame)} ${this.#text}`;

        if (!this.#isInteractive) {
            string += '\n';
        }

        this.clear();
        this.#write(string);

        if (this.#isInteractive) {
            this.#lines = this.#lineCount(string);
        }
    }

    #write(text) {
        this.#stream.write(text);
    }

    #lineCount(text) {
        const width = this.#stream.columns ?? 80;
        const lines = stripVTControlCharacters(text).split('\n');

        let lineCount = 0;
        for (const line of lines) {
            lineCount += Math.max(1, Math.ceil(line.length / width));
        }

        return lineCount;
    }

    #hideCursor() {
        if (this.#isInteractive) {
            this.#write('\u001B[?25l');
        }
    }

    #showCursor() {
        if (this.#isInteractive) {
            this.#write('\u001B[?25h');
        }
    }

    #subscribeToProcessEvents() {
        process.once('SIGINT', this.#exitHandlerBound);
        process.once('SIGTERM', this.#exitHandlerBound);
    }

    #unsubscribeFromProcessEvents() {
        process.off('SIGINT', this.#exitHandlerBound);
        process.off('SIGTERM', this.#exitHandlerBound);
    }

    #exitHandler(signal) {
        if (this.isSpinning) {
            this.stop();
        }

        // SIGINT: 128 + 2
        // SIGTERM: 128 + 15
        const exitCode = signal === 'SIGINT' ? 130 : (signal === 'SIGTERM' ? 143 : 1);
        process.exit(exitCode);
    }
}

/**
Creates a new spinner instance.

@returns A new spinner instance.

@example
```
import yoctoSpinner from 'yocto-spinner';

const spinner = yoctoSpinner({text: 'Loading…'}).start();

setTimeout(() => {
    spinner.success('Success!');
}, 2000);
```
*/
export default function yoctoSpinner(options: Options) {
    return new YoctoSpinner(options);
}

export type SpinnerStyle = {
    readonly interval?: number;
    readonly frames: string[];
};

export type Color =
    | 'black'
    | 'red'
    | 'green'
    | 'yellow'
    | 'blue'
    | 'magenta'
    | 'cyan'
    | 'white'
    | 'gray';

export type Options = {
    /**
    Text to display next to the spinner.

    @default ''
    */
    readonly text?: string;

    /**
    Customize the spinner animation with a custom set of frames and interval.

    ```
    {
        frames: ['-', '\\', '|', '/'],
        interval: 100,
    }
    ```

    Pass in any spinner from [`cli-spinners`](https://github.com/sindresorhus/cli-spinners).
    */
    readonly spinner?: SpinnerStyle;

    /**
    The color of the spinner.

    @default 'cyan'
    */
    readonly color?: Color;

    /**
    The stream to which the spinner is written.

    @default process.stderr
    */
    readonly stream?: Writable;
};

export type Spinner = {
    /**
    Change the text displayed next to the spinner.

    @example
    ```
    spinner.text = 'New text';
    ```
    */
    text: string;

    /**
    Change the spinner color.
    */
    color: Color;

    /**
    Starts the spinner.

    Optionally, updates the text.

    @param text - The text to display next to the spinner.
    @returns The spinner instance.
    */
    start(text?: string): Spinner;

    /**
    Stops the spinner.

    Optionally displays a final message.

    @param finalText - The final text to display after stopping the spinner.
    @returns The spinner instance.
    */
    stop(finalText?: string): Spinner;

    /**
    Stops the spinner and displays a success symbol with the message.

    @param text - The success message to display.
    @returns The spinner instance.
    */
    success(text?: string): Spinner;

    /**
    Stops the spinner and displays an error symbol with the message.

    @param text - The error message to display.
    @returns The spinner instance.
    */
    error(text?: string): Spinner;

    /**
    Stops the spinner and displays a warning symbol with the message.

    @param text - The warning message to display.
    @returns The spinner instance.
    */
    warning(text?: string): Spinner;

    /**
    Stops the spinner and displays an info symbol with the message.

    @param text - The info message to display.
    @returns The spinner instance.
    */
    info(text?: string): Spinner;

    /**
    Clears the spinner.

    @returns The spinner instance.
    */
    clear(): Spinner;

    /**
    Returns whether the spinner is currently spinning.
    */
    get isSpinning(): boolean;
};
