import { update } from 'immutable';

import { Direction } from './Direction';
import { PointAxial } from './PointAxial';
import { arrayInitialize, axialToIndex, getRowCount, getRowSize } from './Util';

const executionHistoryCount = 20;

export type ExecutionHistoryArrow = readonly [number, number, Direction];

export type ExecutionHistoryArray = readonly ExecutionHistoryArrow[];

export type InstructionPointer = {
    readonly coords: PointAxial;
    readonly dir: Direction;
    readonly executedGrid: ReadonlyArray<ReadonlyArray<ReadonlyArray<Direction>>>;
    readonly executionHistory: ExecutionHistoryArray;
};

export function createInstuctionPointer(size: number, coords: PointAxial, dir: Direction): InstructionPointer {
    const [i, j] = axialToIndex(size, coords);
    return {
        coords,
        dir,
        executedGrid: arrayInitialize(getRowCount(size), index =>
            arrayInitialize(getRowSize(size, index), () => [])),
        executionHistory: [[i, j, dir]],
    };
}

export function updateExecutedGrid(i: number, j: number, ip: InstructionPointer): InstructionPointer {
    if (!ip.executedGrid[i][j].includes(ip.dir)) {
        return {
            ...ip,
            executedGrid: update(ip.executedGrid, i, row => update(row, j, cell => [...cell, ip.dir])),
        };
    }

    return ip;
}

export function updateInstructionPointer(
    coords: PointAxial,
    dir: Direction,
    i: number,
    j: number,
    ip: InstructionPointer
): InstructionPointer {
    return {
        coords,
        dir,
        executedGrid: ip.executedGrid,
        executionHistory: [[i, j, dir], ...ip.executionHistory.slice(0, executionHistoryCount - 1)],
    };
}
