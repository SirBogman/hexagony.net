import { ISourceCode } from './SourceCode';

/**
 * Represents the context of Hexagony execution that's independent of the execution
 * state. For example the code and the input string have their own undo stacks and
 * can be modified while a program is executing without affecting the execution
 * state.
 */
export class HexagonyContext {
    public sourceCode: ISourceCode;
    public input: string[];
    public reverse = false;

    /**
     * Indicates whether code is being simulated to support directional typing.
     */
    public isDirectionalTypingSimulation = false;

    constructor(
        sourceCode: ISourceCode,
        inputString = '') {
        this.sourceCode = sourceCode;
        this.input = [...inputString];
    }

    setSourceCode(sourceCode: ISourceCode): void {
        if (this.sourceCode.size !== sourceCode.size) {
            throw new Error('Unexpected hexagon size change.');
        }
        this.sourceCode = sourceCode;
    }

    setInput(inputString: string): void {
        this.input = [...inputString];
    }

    getInstruction(i: number, j: number): string {
        return this.sourceCode.grid[i][j];
    }

    public findInteger(inputPosition: number): { value: bigint; inputPosition: number } {
        let value = 0n;
        let positive = true;

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const byteValue = this.getInputByte(inputPosition);
            if (byteValue == '+' || byteValue === undefined) {
                // Consume this character.
                inputPosition++;
                break;
            }
            if (byteValue == '-') {
                positive = false;
                // Consume this character.
                inputPosition++;
                break;
            }
            const codePoint = byteValue.codePointAt(0) as number;
            if (codePoint >= 48 && codePoint <= 57) {
                break;
            }

            // Consume this character.
            inputPosition++;
        }

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const byteValue = this.getInputByte(inputPosition);
            if (byteValue === undefined) {
                break;
            }
            const codePoint = byteValue.codePointAt(0) as number;
            if (codePoint >= 48 && codePoint <= 57) {
                value = value * 10n + BigInt(byteValue);
                // Consume this character.
                inputPosition++;
            }
            else {
                break;
            }
        }

        return {
            value: positive ? value : -value,
            inputPosition
        };
    }

    public getInputByte(inputPosition: number): string | undefined {
        return inputPosition < this.input.length ? this.input[inputPosition] : undefined;
    }
}
