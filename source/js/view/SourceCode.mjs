import { arrayInitialize, containsWhitespace, countCodepoints, countDebug, getCodeLength, getHexagonSize,
    getRowCount, getRowSize, isWhitespaceOrDebug, removeWhitespace, removeWhitespaceAndDebug
} from '../hexagony/util.mjs';

export function getCode({ grid, prefixGrid }) {
    let code = '';
    for (let i = 0; i < grid.length; i++) {
        const row = grid[i];
        for (let j = 0; j < row.length; j++) {
            code += prefixGrid[i][j] + row[j];
        }
    }
    return code;
}

export class SourceCode {
    constructor(code, size, grid, prefixGrid) {
        this.code = code;
        this.size = size;
        this.grid = grid;
        // The prefix grid preserves whitespace and debug characters.
        this.prefixGrid = prefixGrid;
    }

    static fromObject(object) {
        const { code, size, grid, prefixGrid } = object;
        return new SourceCode(code, size, grid, prefixGrid);
    }

    static fromString(code) {
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

        return new SourceCode(code, size, grid, prefixGrid);
    }

    // Only works when changing the size by one, which is currently the only use case,
    // due to code involved in shifting the bottom half of the hexagon horizontally.
    resizeCode(newSize) {
        const { code, size, grid, prefixGrid } = this;
        const newRowCount = getRowCount(newSize);
        const result = {
            grid: [],
            prefixGrid: [],
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

        const newSourceCode = SourceCode.fromString(getCode(result));
        return containsWhitespace(code) ?
            newSourceCode.layoutCode() :
            newSourceCode.minifyCode();
    }

    resetCode() {
        const { code, size } = this;
        const newCode = '.'.repeat(getCodeLength(size));
        const newSourceCode = SourceCode.fromString(newCode);
        return containsWhitespace(code) ?
            newSourceCode.layoutCode() :
            newSourceCode.minifyCode();
    }

    minifyCode() {
        const minimumLength = getCodeLength(this.size - 1) + 1;
        let result = removeWhitespace(this.code).replace(/\.+$/, '');
        const newLength = countCodepoints(result) - countDebug(result);
        if (newLength < minimumLength) {
            result += '.'.repeat(minimumLength - newLength);
        }
        return result;
    }

    layoutCode() {
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

    toObject() {
        return {
            code: this.code,
            size: this.size,
            grid: this.grid,
            prefixGrid: this.prefixGrid,
        };
    }
}
