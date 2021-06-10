import { immerable } from 'immer';

import { Direction, east, northEast, northWest, southEast, southWest, west } from './Direction';
import { Memory } from './Memory';
import { PointAxial } from './PointAxial';
import { HexagonyContext } from './HexagonyContext';
import { arrayInitialize, getRowCount, getRowSize, indexToAxial, rubyStyleDivide, rubyStyleRemainder } from './Util';

const executionHistoryCount = 20;

export interface EdgeTraversal {
    edgeName: string;
    isBranch: boolean;
}

/**
 * Represents the state of Hexagony execution that evolves over time independently of other things. This may eventually
 * be used to implement step-back to undo a step of execution. Consider the case where you pause execution, modify some
 * code a few steps back from the current IP, then step backwards a few times and then forwards. Stepping backwards
 * would not undo the code change you made. When you step forwards again over the changed code, it would do something
 * different.
 *
 * A HexagonyState needs a HexagonyContext to generate the next state.
 */
export class HexagonyState {
    static [immerable] = true;

    public memory = new Memory();
    public activeIp = 0;
    public ticks = 0;
    public output: number[] = [];

    public size: number;
    public ips: PointAxial[];
    public ipDirs: Direction[];
    public inputPosition = 0;
    public terminationReason: string | null = null;
    public executedGrid: Direction[][][][];
    public executionHistory: [number, number, Direction][][];
    public edgeTraversals: EdgeTraversal[] = [];

    constructor(size: number) {
        this.size = size;
        this.ips = [
            new PointAxial(0, -this.size + 1),
            new PointAxial(this.size - 1, -this.size + 1),
            new PointAxial(this.size - 1, 0),
            new PointAxial(0, this.size - 1),
            new PointAxial(-this.size + 1, this.size - 1),
            new PointAxial(-this.size + 1, 0),
        ];
        this.ipDirs = [east, southEast, southWest, west, northWest, northEast];

        // Create an execution history grid for each IP.
        const rowCount = getRowCount(size);
        this.executedGrid = arrayInitialize(6, () =>
            arrayInitialize(rowCount, index =>
                arrayInitialize(getRowSize(size, index), () => [])));

        this.executionHistory = arrayInitialize(6, index => {
            const [coords, dir] = this.getIPState(index);
            const [i, j] = this.axialToIndex(coords);
            return [[i, j, dir]];
        });
    }

    axialToIndex(coords: PointAxial): [number, number] {
        const x = coords.q;
        const z = coords.r;
        const y = -x - z;
        if (Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) >= this.size) {
            throw new Error('Coordinates out of bounds.');
        }

        const i = z + this.size - 1;
        const j = x + Math.min(i, this.size - 1);
        return [i, j];
    }

    indexToAxial(i: number, j: number): PointAxial {
        return indexToAxial(this.size, i, j);
    }

    /**
     * Set the value of the current memory edge. Used to determine whether branches are followed for directional typing.
     */
    setMemoryValue(value: bigint | number): void {
        this.memory.setValue(value);
    }

    getIPState(ipIndex: number): [PointAxial, Direction] {
        return [this.ips[ipIndex], this.ipDirs[ipIndex]];
    }

    get dir(): Direction {
        return this.ipDirs[this.activeIp];
    }

    set dir(value: Direction) {
        this.ipDirs[this.activeIp] = value;
    }

    get coords(): PointAxial {
        return this.ips[this.activeIp];
    }

    set coords(value: PointAxial) {
        this.ips[this.activeIp] = value;
    }

    step(context: HexagonyContext): void {
        if (this.terminationReason) {
            return;
        }

        this.edgeTraversals = [];

        if (context.reverse) {
            this.dir = this.dir.reverse;
            this.handleMovement();
        }

        const [i, j] = this.axialToIndex(this.coords);

        const cellExecutedState = this.executedGrid[this.activeIp][i][j];
        if (!cellExecutedState.includes(this.dir)) {
            cellExecutedState.push(this.dir);
        }

        const opcode = context.getInstruction(i, j);
        this.executeOpcode(opcode, context);

        if (context.reverse) {
            this.dir = this.dir.reverse;
        }

        // The active coordinates don't change when the program terminates.
        if (this.terminationReason === null) {
            const { activeIp, coords, dir } = this;
            const [i, j] = this.axialToIndex(coords);
            const previous = this.executionHistory[activeIp];
            if (i !== previous[0][0] || j !== previous[0][1] || dir !== previous[0][2]) {
                this.executionHistory[activeIp] = [[i, j, dir], ...previous.slice(0, executionHistoryCount)];
            }
        }
    }

    private executeOpcode(opcode: string, context: HexagonyContext): void {
        // Execute the current instruction
        let newIp = this.activeIp;

        switch (opcode) {
            // NOP
            case '.': break;

            // Terminate
            case '@':
                this.terminationReason = 'Program terminated at @.';
                this.ticks++;
                return;

            // Arithmetic
            case ')': this.memory.setValue(this.memory.getValue() + 1n); break;
            case '(': this.memory.setValue(this.memory.getValue() - 1n); break;
            case '+': this.memory.setValue(this.memory.getLeft() + this.memory.getRight()); break;
            case '-': this.memory.setValue(this.memory.getLeft() - this.memory.getRight()); break;
            case '*': this.memory.setValue(this.memory.getLeft() * this.memory.getRight()); break;
            case '~': this.memory.setValue(-this.memory.getValue()); break;

            case ':':
            case '%': {
                const leftVal = this.memory.getLeft();
                const rightVal = this.memory.getRight();
                let execute = true;
                if (rightVal === 0n) {
                    if (context.isDirectionalTypingSimulation) {
                        execute = false;
                    }
                    else {
                        this.terminationReason = 'Error: Program terminated due to division by zero.';
                        this.ticks++;
                        return;
                    }
                }
                if (execute) {
                    this.memory.setValue(opcode === ':' ?
                        rubyStyleDivide(leftVal, rightVal) :
                        rubyStyleRemainder(leftVal, rightVal));
                }
                break;
            }
            // Memory manipulation
            case '{': this.memory.moveLeft(); break;
            case '}': this.memory.moveRight(); break;
            case '=': this.memory.reverse(); break;
            case '"': this.memory.reverse(); this.memory.moveRight(); this.memory.reverse(); break;
            case '\'': this.memory.reverse(); this.memory.moveLeft(); this.memory.reverse(); break;
            case '^':
                if (this.memory.getValue() > 0) {
                    this.memory.moveRight();
                }
                else {
                    this.memory.moveLeft();
                }
                break;
            case '&':
                if (this.memory.getValue() > 0) {
                    this.memory.setValue(this.memory.getRight());
                }
                else {
                    this.memory.setValue(this.memory.getLeft());
                }
                break;

            case ',': {
                const byteValue = context.getInputByte(this.inputPosition++);
                this.memory.setValue(byteValue !== undefined ? byteValue.codePointAt(0) as number : -1);
                break;
            }
            case ';':
                this.output.push((Number(this.memory.getValue() % 256n) + 256) % 256);
                break;

            case '?': {
                const { value, inputPosition } = context.findInteger(this.inputPosition);
                this.inputPosition = inputPosition;
                this.memory.setValue(value);
                break;
            }
            case '!':
                this.output.push(...new TextEncoder().encode(this.memory.getValue().toString()));
                break;

            // Control flow
            case '_': this.dir = this.dir.reflectAtUnderscore; break;
            case '|': this.dir = this.dir.reflectAtPipe; break;
            case '/': this.dir = this.dir.reflectAtSlash; break;
            case '\\': this.dir = this.dir.reflectAtBackslash; break;
            case '<': this.dir = this.dir.reflectAtLessThan(this.memory.getValue() > 0); break;
            case '>': this.dir = this.dir.reflectAtGreaterThan(this.memory.getValue() > 0); break;

            case ']':
                if (!context.isDirectionalTypingSimulation) {
                    newIp = (this.activeIp + 1) % 6;
                }
                break;

            case '[':
                if (!context.isDirectionalTypingSimulation) {
                    newIp = (this.activeIp + 5) % 6;
                }
                break;

            case '#':
                if (!context.isDirectionalTypingSimulation) {
                    newIp = (Number(this.memory.getValue() % 6n) + 6) % 6;
                }
                break;

            case '$':
                // When reversing for directional typing, ignore $, because not doing so would make it more confusing.
                if (!context.reverse) {
                    this.handleMovement();
                }
                break;

            // Digits, letters, and other characters.
            default: {
                const value = opcode.codePointAt(0) as number;
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

        if (!context.reverse) {
            this.handleMovement();
        }
        this.activeIp = newIp;
        this.ticks++;
    }

    private followEdge(edgeType = '0', isBranch = false): void {
        this.edgeTraversals.push({
            edgeName: `${this.coords},${this.dir},${edgeType}`,
            isBranch,
        });
    }

    private handleMovement(): void {
        this.coords = this.coords.add(this.dir.vector);

        if (this.size == 1) {
            this.coords = new PointAxial(0, 0);
            return;
        }

        const x = this.coords.q;
        const z = this.coords.r;
        const y = -x - z;

        if (Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) < this.size) {
            return;
        }

        const xBigger = Math.abs(x) >= this.size;
        const yBigger = Math.abs(y) >= this.size;
        const zBigger = Math.abs(z) >= this.size;

        // Move the pointer back to the hex near the edge
        this.coords = this.coords.subtract(this.dir.vector);
        const { coords } = this;

        // If two values are still in range, we are wrapping around an edge (not a corner).
        if (!xBigger && !yBigger) {
            this.followEdge();
            this.coords = new PointAxial(coords.q + coords.r, -coords.r);
        }
        else if (!yBigger && !zBigger) {
            this.followEdge();
            this.coords = new PointAxial(-coords.q, coords.q + coords.r);
        }
        else if (!zBigger && !xBigger) {
            this.followEdge();
            this.coords = new PointAxial(-coords.r, -coords.q);
        }
        else {
            // If two values are out of range, we navigated into a corner.
            // We teleport to a location that depends on the current memory value.
            const isPositive = this.memory.getValue() > 0;
            this.followEdge(isPositive ? '+' : '-', true);

            if (!xBigger && !isPositive || !yBigger && isPositive) {
                this.coords = new PointAxial(coords.q + coords.r, -coords.r);
            }
            else if (!yBigger || !zBigger && isPositive) {
                this.coords = new PointAxial(-coords.q, coords.q + coords.r);
            }
            else if (!zBigger || !xBigger) {
                this.coords = new PointAxial(-coords.r, -coords.q);
            }
        }
    }
}
