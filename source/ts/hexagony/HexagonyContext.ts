import { PointAxial } from './PointAxial';
import { ISourceCode } from './SourceCode';
import { axialToIndex, indexToAxial } from './Util';

/**
 * Represents the context of Hexagony execution that's independent of the execution
 * state. For example the code and the input string have their own undo stacks and
 * can be modified while a program is executing without affecting the execution
 * state.
 */
export class HexagonyContext {
    public sourceCode: ISourceCode;
    public input: Uint8Array;
    public reverse = false;

    /**
     * Indicates whether code is being simulated to support directional typing.
     */
    public isDirectionalTypingSimulation = false;

    public constructor(
        sourceCode: ISourceCode,
        inputString = '') {
        this.sourceCode = sourceCode;
        this.input = new TextEncoder().encode(inputString);
    }

    public get size(): number {
        return this.sourceCode.size;
    }

    public axialToIndex(coords: PointAxial): readonly [number, number] {
        return axialToIndex(this.size, coords);
    }

    public indexToAxial(i: number, j: number): PointAxial {
        return indexToAxial(this.size, i, j);
    }

    public setSourceCode(sourceCode: ISourceCode): void {
        if (this.sourceCode.size !== sourceCode.size) {
            throw new Error('Unexpected hexagon size change.');
        }
        this.sourceCode = sourceCode;
    }

    public setInput(inputString: string): void {
        this.input = new TextEncoder().encode(inputString);
    }

    public getInstruction(i: number, j: number): string {
        return this.sourceCode.grid[i][j];
    }

    public findInteger(inputPosition: number): { value: bigint; inputPosition: number } {
        let value = 0n;
        let positive = true;

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const byteValue = this.getInputByte(inputPosition);
            if (byteValue === '+'.charCodeAt(0) || byteValue === undefined) {
                // Consume this character.
                inputPosition++;
                break;
            }
            if (byteValue === '-'.charCodeAt(0)) {
                positive = false;
                // Consume this character.
                inputPosition++;
                break;
            }
            if (byteValue >= 48 && byteValue <= 57) {
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
            if (byteValue >= 48 && byteValue <= 57) {
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

    public getInputByte(inputPosition: number): number | undefined {
        return inputPosition < this.input.length ? this.input[inputPosition] : undefined;
    }
}
