export class PointAxial {
    q: number;
    r: number;

    constructor(q: number, r: number) {
        this.q = q;
        this.r = r;
    }

    add([q, r]: [number, number]) {
        return new PointAxial(this.q + q, this.r + r);
    }

    subtract([q, r]: [number, number]) {
        return new PointAxial(this.q - q, this.r - r);
    }

    toString() { return `${this.q},${this.r}`; }
}
