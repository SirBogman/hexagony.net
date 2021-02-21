export function getCodeLength(hexagonSize) {
    return hexagonSize ? 1 + 6 * (hexagonSize * (hexagonSize - 1)) / 2 : 0;
}

export function getHexagonSize(codeLength) {
    return codeLength ?
        Math.ceil((3 + Math.sqrt(12 * codeLength - 3)) / 6) :
        1;
}

export function minify(code) {
    const size = getHexagonSize(code.length);
    const minimumLength = getCodeLength(size - 1) + 1;
    code = code.replace(/\.+$/, '');
    if (code.length < minimumLength) {
        code += '.'.repeat(minimumLength - code.length);
    }
    return code;
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
