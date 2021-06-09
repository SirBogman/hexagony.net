import { immerable } from 'immer';
import { Direction, east, northEast, southEast } from './Direction';
import { PointAxial } from './PointAxial';

interface IDataValue {
    dir: Direction;
    value: bigint;
    x: number;
    y: number;
}

export class Memory {
    static [immerable] = true;

    mp = new PointAxial(0, 0);
    dir: Direction = east;
    cw = false;
    maxX?: number;
    minX?: number;
    maxY?: number;
    minY?: number;
    // data version is incremented whenever this.data changes.
    dataVersion = 0;
    memoryPointerVersion = 0;
    private data: Record<string, IDataValue> = {};

    reverse(): void {
        this.cw = !this.cw;
        this.memoryPointerVersion++;
    }

    moveLeft(): void {
        [this.mp, this.dir, this.cw] = this.leftIndex;
        this.memoryPointerVersion++;
    }

    moveRight(): void {
        [this.mp, this.dir, this.cw] = this.rightIndex;
        this.memoryPointerVersion++;
    }

    getValueAt(mp: PointAxial, dir: Direction): bigint {
        return this.data[`${mp},${dir}`]?.value ?? 0n;
    }

    tryGetValueAt(mp: PointAxial, dir: Direction): bigint {
        return this.data[`${mp},${dir}`]?.value;
    }

    getMemoryEdges(): number {
        return Object.keys(this.data).length;
    }

    getValue(): bigint {
        return this.getValueAt(this.mp, this.dir);
    }

    getLeft(): bigint {
        const [mp, dir] = this.leftIndex;
        return this.getValueAt(mp, dir);
    }

    getRight(): bigint {
        const [mp, dir] = this.rightIndex;
        return this.getValueAt(mp, dir);
    }

    setValue(value: bigint | number): void {
        const x = this.getX();
        const y = this.getY();
        this.data[`${this.mp},${this.dir}`] = {
            x,
            y,
            dir: this.dir,
            value: BigInt(value),
        };
        if (this.dataVersion === 0 || this.maxX === undefined || x > this.maxX) { this.maxX = x; }
        if (this.dataVersion === 0 || this.minX === undefined || x < this.minX) { this.minX = x; }
        if (this.dataVersion === 0 || this.maxY === undefined || y > this.maxY) { this.maxY = y; }
        if (this.dataVersion === 0 || this.minY === undefined || y < this.minY) { this.minY = y; }
        this.dataVersion++;
    }

    // Get the x coordinate of the current position for the memory view.
    getX(): number {
        return 4 * this.mp.q + 2 * this.mp.r + (this.dir === east ? 1 : 0);
    }

    // Get the y coordinate of the current position for the memory view.
    getY(): number {
        return 2 * this.mp.r + (this.dir === northEast ? 0 : this.dir === east ? 1 : 2);
    }

    get leftIndex(): [PointAxial, Direction, boolean] {
        let { mp, dir, cw } = this;
        if (dir == northEast) {
            mp = cw ? new PointAxial(mp.q + 1, mp.r - 1) : new PointAxial(mp.q, mp.r - 1);
            dir = southEast;
            cw = !cw;
        }
        else if (dir == east) {
            mp = cw ? new PointAxial(mp.q, mp.r + 1) : mp;
            dir = northEast;
        }
        else if (dir == southEast) {
            mp = cw ? new PointAxial(mp.q - 1, mp.r + 1) : mp;
            dir = east;
        }
        return [mp, dir, cw];
    }

    get rightIndex(): [PointAxial, Direction, boolean] {
        let { mp, dir, cw } = this;
        if (dir == northEast) {
            mp = cw ? mp : new PointAxial(mp.q, mp.r - 1);
            dir = east;
        }
        else if (dir == east) {
            mp = cw ? mp : new PointAxial(mp.q + 1, mp.r - 1);
            dir = southEast;
        }
        else if (dir == southEast) {
            mp = cw ? new PointAxial(mp.q - 1, mp.r + 1) : new PointAxial(mp.q, mp.r + 1);
            dir = northEast;
            cw = !cw;
        }
        return [mp, dir, cw];
    }

    get debugString(): string {
        let text = `${this.mp},${this.dir},${this.cw}`;
        for (const key in this.data) {
            text += `\n${key},${this.data[key].value}`;
        }
        return text;
    }

    getDataArray(): IDataValue[] {
        return Object.values(this.data);
    }
}
