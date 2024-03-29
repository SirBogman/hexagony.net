export class PointAxial {
    readonly q: number;
    readonly r: number;

    constructor(q: number, r: number) {
        this.q = q;
        this.r = r;
    }

    add([q, r]: readonly [number, number]): PointAxial {
        return new PointAxial(this.q + q, this.r + r);
    }

    subtract([q, r]: readonly [number, number]): PointAxial {
        return new PointAxial(this.q - q, this.r - r);
    }

    equals(other: PointAxial): boolean {
        return this.q === other.q && this.r === other.r;
    }

    toString(): string {
        return `${this.q},${this.r}`;
    }
}
