import { Map } from 'immutable';

import { MemoryPointer, MemoryPointerDirection } from './MemoryPointer';

interface IDataValue {
    readonly dir: MemoryPointerDirection;
    readonly value: bigint;
    readonly x: number;
    readonly y: number;
}

interface MemoryData {
    data: Map<string, IDataValue>;
    dataVersion: number;
    maxX?: number;
    maxY?: number;
    minX?: number;
    minY?: number;
}

export class Memory {
    readonly data: Map<string, IDataValue>;
    readonly dataVersion: number;
    readonly maxX?: number;
    readonly maxY?: number;
    readonly minX?: number;
    readonly minY?: number;

    public static get initialState(): Memory {
        return new Memory({
            dataVersion: 0,
            data: Map<string, IDataValue>(),
        });
    }

    private constructor(source: MemoryData) {
        this.maxX = source.maxX;
        this.maxY = source.maxY;
        this.minX = source.minX;
        this.minY = source.minY;
        this.data = source.data;
        this.dataVersion = source.dataVersion;
    }

    getValue(memoryPointer: MemoryPointer): bigint {
        return this.data.get(memoryPointer.dataKey)?.value ?? 0n;
    }

    getMemoryEdges(): number {
        return this.data.size;
    }

    setValue(memoryPointer: MemoryPointer, value: bigint | number): Memory {
        const { dataKey, dir, x, y } = memoryPointer;
        return new Memory({
            data: this.data.set(dataKey, {
                x,
                y,
                dir,
                value: BigInt(value),
            }),
            dataVersion: this.dataVersion + 1,
            maxX: this.maxX === undefined ? x : Math.max(this.maxX, x),
            maxY: this.maxY === undefined ? y : Math.max(this.maxY, y),
            minX: this.minX === undefined ? x : Math.min(this.minX, x),
            minY: this.minY === undefined ? y : Math.min(this.minY, y),
        });
    }

    iterateData(): IterableIterator<IDataValue> {
        return this.data.values();
    }
}
