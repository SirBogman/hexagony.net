import { arrayInitialize, containsWhitespace, countCodepoints, countDebug, getCodeLength, getHexagonSize,
    getRowCount, getRowSize, isWhitespaceOrDebug, removeWhitespace, removeWhitespaceAndDebug
} from '../hexagony/Util';

export interface ISourceCode {
    size: number;
    grid: string[][];
    prefixGrid: string[][];
}

/**
 * Represents a source code grid.
 * Intended to be used as an immutable object.
 */
export class SourceCode {
    size: number;
    grid: string[][];
    prefixGrid: string[][];

    private constructor(size: number, grid: string[][], prefixGrid: string[][]) {
        this.size = size;
        this.grid = grid;
        // The prefix grid preserves whitespace and debug characters.
        this.prefixGrid = prefixGrid;
    }

    static fromObject(object: ISourceCode): SourceCode {
        const { size, grid, prefixGrid } = object;
        return new SourceCode(size, grid, prefixGrid);
    }

    static fromString(code: string): SourceCode {
        const size = getHexagonSize(countCodepoints(removeWhitespaceAndDebug(code)));
        const rowCount = getRowCount(size);
        const grid = [];
        const prefixGrid = [];

        const iterator = code[Symbol.iterator]();
        for (let i = 0; i < rowCount; i++) {
            const row = [];
            const prefixRow = [];
            const rowSize = getRowSize(size, i);
            for (let j = 0; j < rowSize; j++) {
                let prefix = '';
                let next = iterator.next();
                while (isWhitespaceOrDebug(next.value)) {
                    prefix += next.value;
                    next = iterator.next();
                }
                prefixRow.push(prefix);
                row.push(next.value || '.');
            }
            grid.push(row);
            prefixGrid.push(prefixRow);
        }

        return new SourceCode(size, grid, prefixGrid);
    }

    containsWhitespace(): boolean {
        for (const row of this.prefixGrid) {
            for (const cell of row) {
                if (cell && containsWhitespace(cell)) {
                    return true;
                }
            }
        }
        return false;
    }

    // Only works when changing the size by one, which is currently the only use case,
    // due to code involved in shifting the bottom half of the hexagon horizontally.
    resizeCode(newSize: number): string {
        const { size, grid, prefixGrid } = this;
        const newRowCount = getRowCount(newSize);
        const result = {
            grid: [] as string[][],
            prefixGrid: [] as string[][],
            size: newSize,
        };

        if (newSize > size) {
            // Make it bigger.
            for (let i = 0; i < grid.length; i++) {
                const row = [];
                const prefixRow = [];
                if (i >= size) {
                    // Shift the bottom half to the right to preserve mirrors.
                    row.push('.');
                    prefixRow.push('');
                }
                row.push(...grid[i]);
                prefixRow.push(...prefixGrid[i]);
                const extraLength = getRowSize(newSize, i) - row.length;
                for (let j = 0; j < extraLength; j++) {
                    row.push('.');
                    prefixRow.push('');
                }
                result.grid.push(row);
                result.prefixGrid.push(prefixRow);
            }
            for (let i = grid.length; i < newRowCount; i++) {
                const length = getRowSize(newSize, i);
                result.grid.push(arrayInitialize(length, () => '.'));
                result.prefixGrid.push(arrayInitialize(length, () => ''));
            }
        }
        else {
            // Make it smaller.
            for (let i = 0; i < newRowCount; i++) {
                const length = getRowSize(newSize, i);
                // offset is used to shift the bottom half to the left to preserve mirrors.
                const offset = i >= newSize ? 1 : 0;
                result.grid.push(grid[i].slice(offset, offset + length));
                result.prefixGrid.push(prefixGrid[i].slice(offset, offset + length));
            }
        }

        const newSourceCode = SourceCode.fromObject(result);
        return this.containsWhitespace() ?
            newSourceCode.layoutCode() :
            newSourceCode.minifyCode();
    }

    resetCode(): string {
        const newCode = '.'.repeat(getCodeLength(this.size));
        const newSourceCode = SourceCode.fromString(newCode);
        return this.containsWhitespace() ?
            newSourceCode.layoutCode() :
            newSourceCode.minifyCode();
    }

    minifyCode(): string {
        const minimumLength = getCodeLength(this.size - 1) + 1;
        let result = removeWhitespace(this.toStringInternal()).replace(/\.+$/, '');
        const newLength = countCodepoints(result) - countDebug(result);
        if (newLength < minimumLength) {
            result += '.'.repeat(minimumLength - newLength);
        }
        return result;
    }

    layoutCode(): string {
        let result = '';
        const rowCount = getRowCount(this.size);
        for (let i = 0; i < rowCount; i++) {
            const row = this.grid[i];
            result += ' '.repeat(rowCount - getRowSize(this.size, i));
            for (let j = 0; j < row.length; j++) {
                const prefix = removeWhitespace(this.prefixGrid[i][j]) || ' ';
                const char = row[j] || '.';
                result += `${prefix}${char}`;
            }
            if (i != rowCount - 1) {
                result += '\n';
            }
        }
        return result;
    }

    toObject(): ISourceCode {
        // Convert to plain object for use with immer.
        // Alternatively, "[immerable] = true" could be added to this class.
        return {
            size: this.size,
            grid: this.grid,
            prefixGrid: this.prefixGrid,
        };
    }

    private toStringInternal(): string {
        let result = '';
        for (let i = 0; i < this.grid.length; i++) {
            const row = this.grid[i];
            for (let j = 0; j < row.length; j++) {
                result += this.prefixGrid[i][j] + row[j];
            }
        }
        return result;
    }

    toString(): string {
        const result = this.toStringInternal();
        return containsWhitespace(result) ? result : this.minifyCode();
    }
}
