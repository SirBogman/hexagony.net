import {east, northEast, southEast} from './direction.mjs';
import {PointAxial} from './pointaxial.mjs';

export class Memory {
    constructor() {
        this.data = {};
        this.mp = new PointAxial(0, 0);
        this.dir = east;
        this.cw = false;
    }

    reverse() {
        this.cw = !this.cw;
    }

    moveLeft() {
        [this.mp, this.dir, this.cw] = this.leftIndex;
    }

    moveRight() {
        [this.mp, this.dir, this.cw] = this.rightIndex;
    }

    getValueAt(mp, dir) {
        return this.data[`${mp},${dir}`] || 0n;
    }

    getValue() {
        return this.getValueAt(this.mp, this.dir);
    }

    getLeft() {
        const [mp, dir] = this.leftIndex;
        return this.getValueAt(mp, dir);
    }

    getRight() {
        const [mp, dir] = this.rightIndex;
        return this.getValueAt(mp, dir);
    }

    setValue(value) {
        this.data[`${this.mp},${this.dir}`] = BigInt(value);
    }

    get leftIndex() {
        let mp = this.mp;
        let dir = this.dir;
        let cw = this.cw;
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

    get rightIndex() {
        let mp = this.mp;
        let dir = this.dir;
        let cw = this.cw;

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

    get debugString() {
        let text = `${this.mp},${this.dir},${this.cw}`;
        for (const key in this.data) {
            text += `\n${key},${this.data[key]}`;
        }
        return text;
    }
}
