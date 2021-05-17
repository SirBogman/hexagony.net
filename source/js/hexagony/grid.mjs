import { arrayInitialize } from './util.mjs';

export class Grid {
    constructor(sourceCode) {
        this.setSourceCode(sourceCode);
        // Create an execution history grid for each IP.
        this.executed = arrayInitialize(6, () =>
            arrayInitialize(this.grid.length, index =>
                arrayInitialize(this.grid[index].length, () => [])));
    }

    // This should only be called if the new source code uses the same size hexagon.
    setSourceCode(sourceCode) {
        if (this.size && this.size !== sourceCode.size) {
            throw new Error('Unexpected hexagon size change.');
        }
        this.size = sourceCode.size;
        this.grid = sourceCode.grid;
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
            if (!array.includes(setExecutedDirection)) {
                array.push(setExecutedDirection);
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
}
