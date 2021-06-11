import { Map } from 'immutable';

import { Direction, east, northEast, southEast } from './Direction';
import { PointAxial } from './PointAxial';

interface IDataValue {
    dir: Direction;
    value: bigint;
    x: number;
    y: number;
}

interface MemoryData {
    cw: boolean
    data: Map<string, IDataValue>;
    dataVersion: number;
    dir: Direction;
    maxX?: number;
    maxY?: number;
    minX?: number;
    minY?: number;
    mp: PointAxial;
}

export class Memory {
    readonly mp: PointAxial;

    // dir may only be east, northEast, or southEast.
    readonly dir: Direction;
    readonly cw: boolean;
    readonly maxX?: number;
    readonly maxY?: number;
    readonly minX?: number;
    readonly minY?: number;
    // data version is incremented whenever this.data changes.
    readonly dataVersion: number;
    readonly data: Map<string, IDataValue>;

    public static get initialState(): Memory {
        return new Memory({
            mp: new PointAxial(0, 0),
            dir: east,
            cw: false,
            dataVersion: 0,
            data: Map<string, IDataValue>(),
        });
    }

    private constructor(source: MemoryData) {
        this.mp = source.mp;
        this.dir = source.dir;
        this.cw = source.cw;
        this.maxX = source.maxX;
        this.maxY = source.maxY;
        this.minX = source.minX;
        this.minY = source.minY;
        this.data = source.data;
        this.dataVersion = source.dataVersion;
    }

    reverse(): Memory {
        return new Memory({
            ...this,
            cw: !this.cw,
        });
    }

    moveLeft(reverse = false): Memory {
        return new Memory({
            ...this,
            ...this.leftIndex(reverse)
        });
    }

    moveRight(reverse = false): Memory {
        return new Memory({
            ...this,
            ...this.rightIndex(reverse)
        });
    }

    getValueAt(mp: PointAxial, dir: Direction): bigint {
        return this.data.get(`${mp},${dir}`)?.value ?? 0n;
    }

    getMemoryEdges(): number {
        return this.data.size;
    }

    getValue(): bigint {
        return this.getValueAt(this.mp, this.dir);
    }

    getLeft(): bigint {
        const { mp, dir } = this.leftIndex();
        return this.getValueAt(mp, dir);
    }

    getRight(): bigint {
        const { mp, dir } = this.rightIndex();
        return this.getValueAt(mp, dir);
    }

    setValue(value: bigint | number): Memory {
        const x = this.getX();
        const y = this.getY();
        return new Memory({
            ...this,
            data: this.data.set(`${this.mp},${this.dir}`, {
                x,
                y,
                dir: this.dir,
                value: BigInt(value),
            }),
            dataVersion: this.dataVersion + 1,
            maxX: this.maxX === undefined ? x : Math.max(this.maxX, x),
            maxY: this.maxY === undefined ? y : Math.max(this.maxY, y),
            minX: this.minX === undefined ? x : Math.min(this.minX, x),
            minY: this.minY === undefined ? y : Math.min(this.minY, y),
        });
    }

    // Get the x coordinate of the current position for the memory view.
    getX(): number {
        return 4 * this.mp.q + 2 * this.mp.r + (this.dir === east ? 1 : 0);
    }

    // Get the y coordinate of the current position for the memory view.
    getY(): number {
        return 2 * this.mp.r + (this.dir === northEast ? 0 : this.dir === east ? 1 : 2);
    }

    static flipClockwise(cw: boolean, flip: boolean): boolean {
        return flip ? !cw : cw;
    }

    leftIndex(reverse = false): { mp: PointAxial, dir: Direction, cw: boolean } {
        const { mp, dir } = this;
        const cw = Memory.flipClockwise(this.cw, reverse);
        if (dir == northEast) {
            return {
                mp: cw ? new PointAxial(mp.q + 1, mp.r - 1) : new PointAxial(mp.q, mp.r - 1),
                dir: southEast,
                cw: Memory.flipClockwise(!cw, reverse),
            };
        }
        else if (dir == east) {
            return {
                mp: cw ? new PointAxial(mp.q, mp.r + 1) : mp,
                dir: northEast,
                cw: Memory.flipClockwise(cw, reverse),
            };
        }

        // southEast
        return {
            mp: cw ? new PointAxial(mp.q - 1, mp.r + 1) : mp,
            dir: east,
            cw: Memory.flipClockwise(cw, reverse),
        };
    }

    rightIndex(reverse = false): { mp: PointAxial, dir: Direction, cw: boolean } {
        const { mp, dir } = this;
        const cw = Memory.flipClockwise(this.cw, reverse);
        if (dir == northEast) {
            return {
                mp: cw ? mp : new PointAxial(mp.q, mp.r - 1),
                dir: east,
                cw: Memory.flipClockwise(cw, reverse),
            };
        }
        else if (dir == east) {
            return {
                mp: cw ? mp : new PointAxial(mp.q + 1, mp.r - 1),
                dir: southEast,
                cw: Memory.flipClockwise(cw, reverse),
            };
        }

        // southEast
        return {
            mp: cw ? new PointAxial(mp.q - 1, mp.r + 1) : new PointAxial(mp.q, mp.r + 1),
            dir: northEast,
            cw: Memory.flipClockwise(!cw, reverse),
        };
    }

    get debugString(): string {
        let text = `${this.mp},${this.dir},${this.cw}`;
        for (const [key, value] of this.data) {
            text += `\n${key},${value.value}`;
        }
        return text;
    }

    iterateData(): IterableIterator<IDataValue> {
        return this.data.values();
    }
}
