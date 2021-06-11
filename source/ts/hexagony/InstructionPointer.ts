import { List, Range, Repeat, Set } from 'immutable';
import { Direction } from './Direction';
import { PointAxial } from './PointAxial';
import { axialToIndex, getRowCount, getRowSize } from './Util';

const executionHistoryCount = 20;

export type InstructionPointer = {
    coords: PointAxial;
    dir: Direction;
    executedGrid: List<List<Set<Direction>>>;
    executionHistory: List<[number, number, Direction]>;
};

export function createInstuctionPointer(size: number, coords: PointAxial, dir: Direction): InstructionPointer {
    const [i, j] = axialToIndex(size, coords);
    return {
        coords,
        dir,
        executedGrid: List(Range(0, getRowCount(size)).map(index =>
            List(Repeat(Set<Direction>(), getRowSize(size, index))))),
        executionHistory: List([[i, j, dir]]),
    };
}

export function updateExecutedGrid(i: number, j: number, ip: InstructionPointer): InstructionPointer {
    if (!ip.executedGrid.get(i)?.get(j)?.contains(ip.dir)) {
        return {
            ...ip,
            executedGrid: ip.executedGrid.update(i, row => row.update(j, cell => cell.add(ip.dir))),
        };
    }

    return ip;
}

export function updateInstructionPointer(coords: PointAxial, dir: Direction, i: number, j: number, ip: InstructionPointer): InstructionPointer {
    let { executionHistory } = ip;
    executionHistory = executionHistory.unshift([i, j, dir]);

    if (executionHistory.size > executionHistoryCount) {
        executionHistory = executionHistory.pop();
    }

    return {
        coords,
        dir,
        executedGrid: ip.executedGrid,
        executionHistory,
    };
}
