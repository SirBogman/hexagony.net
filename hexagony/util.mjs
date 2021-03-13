import {PointAxial} from './pointaxial.mjs';

export function arraysEqual(a, b) {
    if (a === null || b === null)
        return (a === null) === (b === null);

    if (a.length !== b.length) {
        return false;
    }

    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }

    return true;
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

export function minifySource(code) {
    code = removeWhitespace(code);
    const size = getHexagonSize(countCodepoints(code));
    const minimumLength = getCodeLength(size - 1) + 1;
    code = code.replace(/\.+$/, '');
    const newLength = countCodepoints(code);
    if (newLength < minimumLength) {
        code += '.'.repeat(minimumLength - newLength);
    }
    return code;
}

export function layoutSource(code) {
    code = removeWhitespace(code);
    const size = getHexagonSize(countCodepoints(removeDebug(code)));
    const iterator = code[Symbol.iterator]();
    let newCode = '';
    const rowCount = getRowCount(size);
    for (let i = 0; i < rowCount; i++) {
        newCode += ' '.repeat(rowCount - getRowSize(size, i));
        for (let j = 0; j < getRowSize(size, i); j++) {
            let prefix = ' ';
            let next = iterator.next();
            if (next.value == '`') {
                prefix = '`';
                next = iterator.next();
            }
            newCode += `${prefix}${next.value || '.'}`;
        }
        if (i != rowCount - 1) {
            newCode += '\n';
        }
    }
    return newCode;
}

export function removeDebug(code) {
    return code.replaceAll(/`/g, '');
}

export function removeWhitespace(code) {
    return code.replaceAll(/ |\t|\r|\n/g, '');
}

export function removeWhitespaceAndDebug(code) {
    return code.replaceAll(/ |\t|\r|\n|`/g, '');
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
    return (leftVal < 0) != (rightVal < 0) && result != 0 ? result + rightVal : result;
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
    return (leftVal < 0) != (rightVal < 0) && leftVal % rightVal != 0 ? result - 1n : result;
}
