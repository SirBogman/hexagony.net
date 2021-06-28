import { East, east, NorthEast, northEast, SouthEast, southEast } from './Direction';
import { PointAxial } from './PointAxial';

export type MemoryPointerDirection = East | NorthEast | SouthEast;

export class MemoryPointer {
    readonly mp: PointAxial;
    readonly dir: MemoryPointerDirection;
    readonly cw: boolean;

    public static get initialState(): MemoryPointer {
        return new MemoryPointer(new PointAxial(0, 0), east, false);
    }

    private constructor(mp: PointAxial, dir: MemoryPointerDirection, cw: boolean) {
        this.mp = mp;
        this.dir = dir;
        this.cw = cw;
    }

    // Get the x coordinate of the current position for the memory view.
    get x(): number {
        return 4 * this.mp.q + 2 * this.mp.r + (this.dir === east ? 1 : 0);
    }

    // Get the y coordinate of the current position for the memory view.
    get y(): number {
        return 2 * this.mp.r + (this.dir === northEast ? 0 : this.dir === east ? 1 : 2);
    }

    get dataKey(): string {
        return `${this.mp.toString()},${this.dir.toString()}`;
    }

    reverse(): MemoryPointer {
        return new MemoryPointer(this.mp, this.dir, !this.cw);
    }

    private static flipClockwise(cw: boolean, flip: boolean): boolean {
        return flip ? !cw : cw;
    }

    moveLeft(reverse = false): MemoryPointer {
        const { mp, dir } = this;
        const cw = MemoryPointer.flipClockwise(this.cw, reverse);
        if (dir === northEast) {
            return new MemoryPointer(
                cw ? new PointAxial(mp.q + 1, mp.r - 1) : new PointAxial(mp.q, mp.r - 1),
                southEast,
                MemoryPointer.flipClockwise(!cw, reverse));
        }
        else if (dir === east) {
            return new MemoryPointer(
                cw ? new PointAxial(mp.q, mp.r + 1) : mp,
                northEast,
                MemoryPointer.flipClockwise(cw, reverse));
        }

        // southEast
        return new MemoryPointer(
            cw ? new PointAxial(mp.q - 1, mp.r + 1) : mp,
            east,
            MemoryPointer.flipClockwise(cw, reverse));
    }

    moveRight(reverse = false): MemoryPointer {
        const { mp, dir } = this;
        const cw = MemoryPointer.flipClockwise(this.cw, reverse);
        if (dir === northEast) {
            return new MemoryPointer(
                cw ? mp : new PointAxial(mp.q, mp.r - 1),
                east,
                MemoryPointer.flipClockwise(cw, reverse));
        }
        else if (dir === east) {
            return new MemoryPointer(
                cw ? mp : new PointAxial(mp.q + 1, mp.r - 1),
                southEast,
                MemoryPointer.flipClockwise(cw, reverse));
        }

        // southEast
        return new MemoryPointer(
            cw ? new PointAxial(mp.q - 1, mp.r + 1) : new PointAxial(mp.q, mp.r + 1),
            northEast,
            MemoryPointer.flipClockwise(!cw, reverse));
    }

    moveBackLeft(): MemoryPointer {
        return this.moveRight(true);
    }

    moveBackRight(): MemoryPointer {
        return this.moveLeft(true);
    }
}
