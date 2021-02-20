export class PointAxial {
    constructor(q, r) {
        this.q = q;
        this.r = r;
    }

    add(vector) {
        const [q, r] = vector;
        this.q += q;
        this.r += r;
    }

    subtract(vector) {
        const [q, r] = vector;
        this.q -= q;
        this.r -= r;
    }

    toString() { return `${this.q},${this.r}`; }
}