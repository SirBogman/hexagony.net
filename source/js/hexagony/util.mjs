import { PointAxial } from './pointaxial.mjs';

export function arrayInitialize(length, indexToValue) {
    return Array.from(new Array(length), (_, index) => indexToValue(index));
}

export function countBytes(code) {
    return new TextEncoder().encode(code).length;
}

export function countCodepoints(code) {
    let count = 0;
    // eslint-disable-next-line no-unused-vars
    for (const _ of code) {
        count++;
    }
    return count;
}

// Returns the number of debug metacharacters.
export function countDebug(code) {
    return (code.match(/`/g) || []).length;
}

export function countOperators(code) {
    let count = 0;
    for (const char of removeWhitespaceAndDebug(code)) {
        if (char != '.') {
            count++;
        }
    }
    return count;
}

export function getCodeLength(hexagonSize) {
    return hexagonSize ? 1 + 6 * (hexagonSize * (hexagonSize - 1)) / 2 : 0;
}

export function getHexagonSize(codeLength) {
    return codeLength ?
        Math.ceil((3 + Math.sqrt(12 * codeLength - 3)) / 6) :
        1;
}

export function indexToAxial(size, rowIndex, columnIndex) {
    return new PointAxial(Math.max(1 - size, -rowIndex) + columnIndex, rowIndex - size + 1);
}

export function isWhitespaceOrDebug(char) {
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

export function containsWhitespace(code) {
    return code.match(/ |\t|\n|\v|\f|\r/);
}

export function removeWhitespace(code) {
    return code.replace(/ |\t|\n|\v|\f|\r/g, '');
}

export function removeWhitespaceAndDebug(code) {
    return code.replace(/ |\t|\n|\v|\f|\r|`/g, '');
}

export function getRowCount(size) {
    return size * 2 - 1;
}

export function getRowSize(size, i) {
    let extra = i;
    if (extra >= size) {
        extra = getRowCount(size) - 1 - i;
    }
    return size + extra;
}

export function rubyStyleRemainder(leftVal, rightVal) {
    // The semantics of integer division and modulo are different in Hexagony because the
    // reference interpreter was written in Ruby. Account for this discrepancy.
    const result = leftVal % rightVal;
    return leftVal < 0 != rightVal < 0 && result != 0 ? result + rightVal : result;
}

export function rubyStyleDivide(leftVal, rightVal) {
    // The semantics of integer division and modulo are different in Hexagony because the
    // reference interpreter was written in Ruby. Account for this discrepancy.
    // Example: -5 / 15 == -1
    // Example: -5 % 15 == 10
    // Example: -5 / -15 == -1
    // Example: 5 % -15 == -10
    // Example: 5 / 15 == 0
    // Example: 5 % 15 == 5
    const result = leftVal / rightVal;
    return leftVal < 0 != rightVal < 0 && leftVal % rightVal != 0 ? result - 1n : result;
}
