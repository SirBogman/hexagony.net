import { PointAxial } from './PointAxial';

export function arrayInitialize<T>(length: number, indexToValue: (index: number) => T): T[] {
    return Array.from(new Array(length), (_, index) => indexToValue(index));
}

export function countBytes(code: string): number {
    return new TextEncoder().encode(code).length;
}

export function countCodepoints(code: string): number {
    let count = 0;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const _ of code) {
        count++;
    }
    return count;
}

// Returns the number of debug metacharacters.
export function countDebug(code: string): number {
    return (code.match(/`/g) || []).length;
}

export function countOperators(code: string): number {
    let count = 0;
    for (const char of removeWhitespaceAndDebug(code)) {
        if (char !== '.') {
            count++;
        }
    }
    return count;
}

export function getCodeLength(hexagonSize: number): number {
    return hexagonSize ? 1 + 6 * (hexagonSize * (hexagonSize - 1)) / 2 : 0;
}

export function getHexagonSize(codeLength: number): number {
    return codeLength ?
        Math.ceil((3 + Math.sqrt(12 * codeLength - 3)) / 6) :
        1;
}

export function axialToIndex(size: number, coords: PointAxial): readonly [number, number] {
    const x = coords.q;
    const z = coords.r;
    const y = -x - z;
    if (Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) >= size) {
        throw new Error('Coordinates out of bounds.');
    }

    const i = z + size - 1;
    const j = x + Math.min(i, size - 1);
    return [i, j];
}

export function indexToAxial(size: number, rowIndex: number, columnIndex: number): PointAxial {
    return new PointAxial(Math.max(1 - size, -rowIndex) + columnIndex, rowIndex - size + 1);
}

export function isWhitespaceOrDebug(char: string): boolean {
    switch (char) {
        case '`':
        case ' ':
        case '\t':
        case '\n':
        case '\v':
        case '\f':
        case '\r':
            return true;
        default:
            return false;
    }
}

export function containsWhitespace(code: string): boolean {
    return Boolean(/ |\t|\n|\v|\f|\r/.exec(code));
}

export function removeWhitespace(code: string): string {
    return code.replace(/ |\t|\n|\v|\f|\r/g, '');
}

export function removeWhitespaceAndDebug(code: string): string {
    return code.replace(/ |\t|\n|\v|\f|\r|`/g, '');
}

export function getRowCount(size: number): number {
    return size * 2 - 1;
}

export function getRowSize(size: number, i: number): number {
    let extra = i;
    if (extra >= size) {
        extra = getRowCount(size) - 1 - i;
    }
    return size + extra;
}

export function rubyStyleRemainder(leftVal: bigint, rightVal: bigint): bigint {
    // The semantics of integer division and modulo are different in Hexagony because the
    // reference interpreter was written in Ruby. Account for this discrepancy.
    const result = leftVal % rightVal;
    return leftVal < 0 !== rightVal < 0 && result !== 0n ? result + rightVal : result;
}

export function rubyStyleDivide(leftVal: bigint, rightVal: bigint): bigint {
    // The semantics of integer division and modulo are different in Hexagony because the
    // reference interpreter was written in Ruby. Account for this discrepancy.
    // Example: -5 / 15 == -1
    // Example: -5 % 15 == 10
    // Example: -5 / -15 == -1
    // Example: 5 % -15 == -10
    // Example: 5 / 15 == 0
    // Example: 5 % 15 == 5
    const result = leftVal / rightVal;
    return leftVal < 0 !== rightVal < 0 && leftVal % rightVal !== 0n ? result - 1n : result;
}
