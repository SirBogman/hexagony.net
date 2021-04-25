import { arrayInitialize, getHexagonSize, getRowSize } from './util.mjs';

export class Grid {
    constructor(sourceCode) {
        this.setSourceCode(sourceCode);
    }

    // This should only be called if the new source code uses the same size hexagon.
    setSourceCode(sourceCode) {
        const data = [];
        for (const char of sourceCode) {
            switch (char) {
                case '`':
                case ' ':
                case '\t':
                case '\n':
                case '\v':
                case '\f':
                case '\r':
                    break;
                default:
                    data.push(char);
                    break;
            }
        }
        this.size = getHexagonSize(data.length);
        this.rowCount = this.size * 2 - 1;
        let k = 0;
        const grid = [];
        for (let i = 0; i < this.rowCount; ++i) {
            const row = [];
            for (let j = 0; j < this.rowSize(i); ++j) {
                row.push(k < data.length ? data[k] : '.');
                k++;
            }
            grid.push(row);
        }
        this.grid = grid;
        this.executed = arrayInitialize(6, () =>
            arrayInitialize(this.rowCount, index =>
                arrayInitialize(this.rowSize(index), () => [])));
    }

    getExecutedGrid() {
        return this.executed;
    }

    getInstruction(coords, setExecutedDirection = null, activeIp = null) {
        const index = this.axialToIndex(coords);
        if (!index) {
            return '.';
        }

        if (setExecutedDirection && activeIp !== null) {
            const array = this.executed[activeIp][index[0]][index[1]];
            const { angle } = setExecutedDirection;
            if (!array.includes(angle)) {
                array.push(angle);
            }
        }

        return this.grid[index[0]][index[1]];
    }

    axialToIndex(coords) {
        const x = coords.q;
        const z = coords.r;
        const y = -x - z;
        if (Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) >= this.size) {
            return null;
        }

        const i = z + this.size - 1;
        const j = x + Math.min(i, this.size - 1);
        return [i, j];
    }

    rowSize(i) {
        return getRowSize(this.size, i);
    }
}
