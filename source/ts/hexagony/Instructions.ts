import { Range } from 'immutable';

const mirror = '_, |, /, and \\ are mirrors. They reflect the instruction pointer based on it’s current direction. ' +
    'See the about page for examples.';

const branch = (instruction:string, dir1: string, dir2: string, dir3: string) =>
    '< and > act as either a mirror or a branch, depending on the current direction of the instruction ' +
    `pointer (IP). If the current memory edge is positive, the IP takes a 60 degree right turn (e.g. ${instruction} ` +
    `turns ${dir1} into ${dir2}). If the current memory edge is zero or negative, the IP takes a 60 degree left turn ` +
    `(e.g. ${instruction} turns ${dir1} into ${dir3}).`;

const digitDescription =
    '0-9 will multiply the current memory edge by 10 and add the corresponding digit. If the current edge has a ' +
    'negative value, the digit is subtracted instead of added. This allows you to write decimal numbers in the ' +
    'source code despite each digit being processed separately.';

const instructionDescriptions = new Map<string, string>([
    ['.', '. is a no-op: the instruction pointer will simply pass through.'],
    ['@', '@ terminates the program.'],
    [')', ') increments the current memory edge.'],
    ['(', '( decrements the current memory edge.'],
    ['+', '+ sets the current memory edge to the sum of the left and right neighbors.'],
    ['-', '- sets the current memory edge to the difference of the left and right neighbors (left - right).'],
    ['*', '* sets the current memory edge to the product of the left and right neighbors.'],
    [':', ': sets the current memory edge to the quotient of the left and right neighbors (left / right, rounded ' +
        'towards negative infinity).'],
    ['%', '% sets the current memory edge to the modulo of the left and right neighbors (left % right, the sign of ' +
        'the result is the same as the sign of right).'],
    ['~', '~ multiplies the current memory edge by -1.'],
    [',', ', reads a single byte of input and sets the current memory edge to its value. Returns -1 once EOF is ' +
        'reached.'],
    ['?', '? reads and discards input until a digit, a - or a + is found. Then reads as many bytes as possible to ' +
        'form a valid (signed) decimal integer and sets the current memory edge to its value. The next byte after ' +
        'the number is not consumed by this command and can be read with ,. Returns 0 if EOF is reached without ' +
        'finding a valid number.'],
    [';', '; outputs the current memory edge’s value (modulo 256) as byte.'],
    ['!', '! outputs the decimal representation of the current memory edge.'],
    ['$', '$ is a jump. When executed, the instruction pointer completely ignores the next command in its current ' +
        'direction. This is like Befunge’s #.'],
    ['_', mirror],
    ['|', mirror],
    ['/', mirror],
    ['\\', mirror],
    ['<', branch('<', 'E', 'SE', 'NE')],
    ['>', branch('>', 'W', 'NW', 'SW')],
    ['[', '[ switches control to the previous instruction pointer (IP), wrapping around from 0 to 5, after the ' +
        'current IP takes a step.'],
    [']', '] switches control to the next instruction pointer (IP), wrapping around from 5 to 0, after the current ' +
        'IP takes a step.'],
    ['#', '# takes the current memory edge modulo 6 and switches to the instruction pointer (IP) with that index, ' +
        'after the current IP takes a step.'],
    ['{', '{ moves the memory pointer to the left neighbor.'],
    ['}', '} moves the memory pointer to the right neighbor.'],
    ['"', '" moves the memory pointer backwards and to the left. This is equivalent to =}=.'],
    ['\'', '\' moves the memory pointer backwards and to the right. This is equivalent to ={=.'],
    ['=', '= reverses the direction of the memory pointer. (This doesn’t affect the current memory edge, but changes ' +
        'which edges are considered the left and right neighbor.)'],
    ['^', '^ moves the memory pointer to the left neighbor, if the current edge is zero or negative, and to the ' +
        'right neighbor, if it’s positive.'],
    ['&', '& copies the value of left neighbor into the current edge, if the current edge is zero or negative, and ' +
        'the value of the right neighbor, if it’s positive.'],
    ...Range(0, 10).map(x => [x.toString(), digitDescription] as [string, string]),
]);

const characterDescription = (character: string): string =>
    `Sets the current memory edge to the character’s codepoint: ${character.codePointAt(0)}.`;

export const getInstructionDescription = (character: string): string =>
    instructionDescriptions.get(character) ?? characterDescription(character);
