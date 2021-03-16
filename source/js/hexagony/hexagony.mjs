import {east, northEast, northWest, southEast, southWest, west} from './direction.mjs';
import {Grid} from './grid.mjs';
import {Memory} from './memory.mjs';
import {PointAxial} from './pointaxial.mjs';
import {rubyStyleDivide, rubyStyleRemainder} from './util.mjs';

export class Hexagony {
    constructor(sourceCode, inputString, edgeEventHandler) {
        this.grid = new Grid(sourceCode);
        this.memory = new Memory();
        this.setInput(inputString);
        this.inputPosition = 0;
        this.edgeEventHandler = edgeEventHandler;
        this.ips = [
            new PointAxial(0, -this.grid.size + 1),
            new PointAxial(this.grid.size - 1, -this.grid.size + 1),
            new PointAxial(this.grid.size - 1, 0),
            new PointAxial(0, this.grid.size - 1),
            new PointAxial(-this.grid.size + 1, this.grid.size - 1),
            new PointAxial(-this.grid.size + 1, 0)
        ];
        this.ipDirs = [east, southEast, southWest, west, northWest, northEast];
        this.activeIp = 0;
        this.ticks = 0;
        this.output = '';
        this.error = null;
        this.generator = this.execute();
    }

    getTerminationReason() {
        return this.terminationReason;
    }

    setSourceCode(sourceCode) {
        this.grid.setSourceCode(sourceCode);
    }

    setInput(inputString) {
        this.input = [...inputString];
    }

    getExecutedGrid() {
        return this.grid.getExecutedGrid();
    }

    getIPState(ipIndex) {
        return [this.ips[ipIndex], this.ipDirs[ipIndex]];
    }

    get dir() {
        return this.ipDirs[this.activeIp];
    }

    get coords() {
        return this.ips[this.activeIp];
    }

    step() {
        this.generator.next();
    }

    * execute() {
        while (!this.terminationReason) {
            yield;

            // Execute the current instruction
            let newIp = this.activeIp;
            const opcode = this.grid.getInstruction(this.coords, this.dir);

            switch (opcode) {
                // NOP
                case '.': break;

                // Terminate
                case '@':
                    this.terminationReason = "Program terminated at @."
                    this.ticks++;
                    return;

                // Arithmetic
                case ')': this.memory.setValue(this.memory.getValue() + 1n); break;
                case '(': this.memory.setValue(this.memory.getValue() - 1n); break;
                case '+': this.memory.setValue(this.memory.getLeft() + this.memory.getRight()); break;
                case '-': this.memory.setValue(this.memory.getLeft() - this.memory.getRight()); break;
                case '*': this.memory.setValue(this.memory.getLeft() * this.memory.getRight()); break;
                case '~': this.memory.setValue(-this.memory.getValue()); break;

                case ':': {
                    const leftVal = this.memory.getLeft();
                    const rightVal = this.memory.getRight();
                    if (rightVal == 0) {
                        this.terminationReason = "Error: Program terminated due to division by zero.";
                        this.ticks++;
                        return;
                    }
                    this.memory.setValue(rubyStyleDivide(leftVal, rightVal));
                    break;
                }
                case '%': {
                    const leftVal = this.memory.getLeft();
                    const rightVal = this.memory.getRight();
                    if (rightVal == 0) {
                        this.terminationReason = "Error: Program terminated due to division by zero.";
                        this.ticks++;
                        return;
                    }
                    this.memory.setValue(rubyStyleRemainder(leftVal, rightVal));
                    break;
                }
                // Memory manipulation
                case '{': this.memory.moveLeft(); break;
                case '}': this.memory.moveRight(); break;
                case '=': this.memory.reverse(); break;
                case '"': this.memory.reverse(); this.memory.moveRight(); this.memory.reverse(); break;
                case '\'': this.memory.reverse(); this.memory.moveLeft(); this.memory.reverse(); break;
                case '^':
                    if (this.memory.getValue() > 0)
                        this.memory.moveRight();
                    else
                        this.memory.moveLeft();
                    break;
                case '&':
                    if (this.memory.getValue() > 0)
                        this.memory.setValue(this.memory.getRight());
                    else
                        this.memory.setValue(this.memory.getLeft());
                    break;

                case ',': {
                    const byteValue = this.readByte();
                    this.memory.setValue(byteValue !== undefined ? byteValue.codePointAt(0) : -1);
                    break;
                }
                case ';':
                    this.appendOutput(String.fromCharCode(Number(this.memory.getValue() % 256n)));
                    break;

                case '?':
                    this.memory.setValue(this.findInteger());
                    break;

                case '!':
                    this.appendOutput(this.memory.getValue().toString());
                    break;

                // Control flow
                case '_': this.ipDirs[this.activeIp] = this.dir.reflectAtUnderscore; break;
                case '|': this.ipDirs[this.activeIp] = this.dir.reflectAtPipe; break;
                case '/': this.ipDirs[this.activeIp] = this.dir.reflectAtSlash; break;
                case '\\': this.ipDirs[this.activeIp] = this.dir.reflectAtBackslash; break;
                case '<': this.ipDirs[this.activeIp] = this.dir.reflectAtLessThan(this.memory.getValue() > 0); break;
                case '>': this.ipDirs[this.activeIp] = this.dir.reflectAtGreaterThan(this.memory.getValue() > 0); break;
                case ']': newIp = (this.activeIp + 1) % 6; break;
                case '[': newIp = (this.activeIp + 5) % 6; break;
                case '#': newIp = (Number(this.memory.getValue() % 6) + 6) % 6; break;
                case '$': this.ips[this.activeIp].add(this.dir.vector); this.handleEdges(); break;

                // Digits, letters, and other characters.
                default: {
                    const value = opcode.codePointAt(0);
                    if (value >= 48 && value <= 57) {
                        const memVal = this.memory.getValue();
                        this.memory.setValue(memVal * 10n + (memVal < 0 ? -BigInt(opcode) : BigInt(opcode)));
                    }
                    else {
                        this.memory.setValue(value);
                    }
                    break;
                }
            }

            this.ips[this.activeIp].add(this.dir.vector);
            this.handleEdges();
            this.activeIp = newIp;
            this.ticks++;
        }
    }

    appendOutput(string) {
        this.output += string;
    }

    followEdge(edgeType = 0, isBranch = false) {
        if (this.edgeEventHandler) {
            this.edgeEventHandler(`${this.coords},${this.dir},${edgeType}`, isBranch);
        }
    }

    handleEdges() {
        if (this.grid.size == 1) {
            this.ips[this.activeIp] = new PointAxial(0, 0);
            return;
        }

        const x = this.coords.q;
        const z = this.coords.r;
        const y = -x - z;

        if (Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) < this.grid.size)
            return;

        const xBigger = Math.abs(x) >= this.grid.size;
        const yBigger = Math.abs(y) >= this.grid.size;
        const zBigger = Math.abs(z) >= this.grid.size;

        // Move the pointer back to the hex near the edge
        this.ips[this.activeIp].subtract(this.dir.vector);
        const coords = this.coords;

        // If two values are still in range, we are wrapping around an edge (not a corner).
        if (!xBigger && !yBigger) {
            this.followEdge();
            this.ips[this.activeIp] = new PointAxial(coords.q + coords.r, -coords.r);
        }
        else if (!yBigger && !zBigger) {
            this.followEdge();
            this.ips[this.activeIp] = new PointAxial(-coords.q, coords.q + coords.r);
        }
        else if (!zBigger && !xBigger) {
            this.followEdge();
            this.ips[this.activeIp] = new PointAxial(-coords.r, -coords.q);
        }
        else {
            // If two values are out of range, we navigated into a corner.
            // We teleport to a location that depends on the current memory value.
            const isPositive = this.memory.getValue() > 0;
            this.followEdge(isPositive ? '+' : '-', true);

            if (!xBigger && !isPositive || !yBigger && isPositive)
                this.ips[this.activeIp] = new PointAxial(coords.q + coords.r, -coords.r);
            else if (!yBigger || !zBigger && isPositive)
                this.ips[this.activeIp] = new PointAxial(-coords.q, coords.q + coords.r);
            else if (!zBigger || !xBigger)
                this.ips[this.activeIp] = new PointAxial(-coords.r, -coords.q);
        }
    }

    findInteger() {
        let value = 0n;
        let positive = true;

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const byteValue = this.peekByte();
            if (byteValue == '+' || byteValue === undefined) {
                // Consume this character.
                this.readByte();
                break;
            }
            if (byteValue == '-') {
                positive = false;
                // Consume this character.
                this.readByte();
                break;
            }
            const codePoint = byteValue.codePointAt(0);
            if (codePoint >= 48 && codePoint <= 57) {
                break;
            }

            // Consume this character.
            this.readByte();
        }

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const byteValue = this.peekByte();
            if (byteValue === undefined) {
                break;
            }
            const codePoint = byteValue.codePointAt(0);
            if (codePoint >= 48 && codePoint <= 57) {
                value = value * 10n + BigInt(byteValue);
                // Consume this character.
                this.readByte();
            }
            else {
                break;
            }
        }

        return positive ? value : -value;
    }

    peekByte() {
        return this.inputPosition < this.input.length ? this.input[this.inputPosition] : undefined;
    }

    readByte() {
        return this.inputPosition < this.input.length ? this.input[this.inputPosition++] : undefined;
    }
}