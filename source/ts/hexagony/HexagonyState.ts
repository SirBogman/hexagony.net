import { immerable } from 'immer';

import { Direction, east, northEast, northWest, southEast, southWest, west } from './Direction';
import { Memory } from './Memory';
import { MemoryPointer } from './MemoryPointer';
import { PointAxial } from './PointAxial';
import { HexagonyContext } from './HexagonyContext';
import { arrayInitialize, getRowCount, getRowSize, rubyStyleDivide, rubyStyleRemainder } from './Util';

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

    public memory = Memory.initialState;
    public mp = MemoryPointer.initialState;
    public activeIp = 0;
    public ticks = 0;
    public output: number[] = [];

    public ips: PointAxial[];
    public ipDirs: Direction[];
    public inputPosition = 0;
    public terminationReason: string | null = null;
    public executedGrid: Direction[][][][];
    public executionHistory: [number, number, Direction][][];
    public edgeTraversals: EdgeTraversal[] = [];

    constructor(context: HexagonyContext) {
        const { size } = context;
        this.ips = [
            new PointAxial(0, -size + 1),
            new PointAxial(size - 1, -size + 1),
            new PointAxial(size - 1, 0),
            new PointAxial(0, size - 1),
            new PointAxial(-size + 1, size - 1),
            new PointAxial(-size + 1, 0),
        ];
        this.ipDirs = [east, southEast, southWest, west, northWest, northEast];

        // Create an execution history grid for each IP.
        const rowCount = getRowCount(size);
        this.executedGrid = arrayInitialize(6, () =>
            arrayInitialize(rowCount, index =>
                arrayInitialize(getRowSize(size, index), () => [])));

        this.executionHistory = arrayInitialize(6, index => {
            const [coords, dir] = this.getIPState(index);
            const [i, j] = context.axialToIndex(coords);
            return [[i, j, dir]];
        });
    }

    /**
     * Set the value of the current memory edge. Used to determine whether branches are followed for directional typing.
     */
    setMemoryValue(value: bigint | number): void {
        this.memory = this.memory.setValue(this.mp, value);
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
            this.handleMovement(context.size);
        }

        const [i, j] = context.axialToIndex(this.coords);

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
            const [i, j] = context.axialToIndex(coords);
            const previous = this.executionHistory[activeIp];
            if (i !== previous[0][0] || j !== previous[0][1] || dir !== previous[0][2]) {
                this.executionHistory[activeIp] = [[i, j, dir], ...previous.slice(0, executionHistoryCount)];
            }
        }
    }

    private executeOpcode(opcode: string, context: HexagonyContext): void {
        // Execute the current instruction
        let newIp = this.activeIp;
        const { memory, mp } = this;

        switch (opcode) {
            // NOP
            case '.': break;

            // Terminate
            case '@':
                this.terminationReason = 'Program terminated at @.';
                this.ticks++;
                return;

            // Arithmetic
            case ')':
                this.memory = memory.setValue(mp, memory.getValue(mp) + 1n);
                break;
            case '(':
                this.memory = memory.setValue(mp, memory.getValue(mp) - 1n);
                break;
            case '+':
                this.memory = memory.setValue(mp, memory.getValue(mp.moveLeft()) + memory.getValue(mp.moveRight()));
                break;
            case '-':
                this.memory = memory.setValue(mp, memory.getValue(mp.moveLeft()) - memory.getValue(mp.moveRight()));
                break;
            case '*':
                this.memory = memory.setValue(mp, memory.getValue(mp.moveLeft()) * memory.getValue(mp.moveRight()));
                break;
            case '~':
                this.memory = memory.setValue(mp, -memory.getValue(mp));
                break;

            case ':':
            case '%': {
                const leftVal = memory.getValue(mp.moveLeft());
                const rightVal = memory.getValue(mp.moveRight());
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
                    this.memory = memory.setValue(
                        mp,
                        opcode === ':' ?
                            rubyStyleDivide(leftVal, rightVal) :
                            rubyStyleRemainder(leftVal, rightVal));
                }
                break;
            }
            // Memory manipulation
            case '{': this.mp = mp.moveLeft(); break;
            case '}': this.mp = mp.moveRight(); break;
            case '=': this.mp = mp.reverse(); break;
            case '"': this.mp = mp.moveRight(true); break;
            case '\'': this.mp = mp.moveLeft(true); break;
            case '^':
                this.mp = memory.getValue(mp) > 0 ?
                    mp.moveRight() :
                    mp.moveLeft();
                break;
            case '&':
                this.memory = memory.setValue(
                    mp,
                    memory.getValue(mp) > 0 ?
                        memory.getValue(mp.moveRight()) :
                        memory.getValue(mp.moveLeft()));
                break;

            case ',': {
                const byteValue = context.getInputByte(this.inputPosition++);
                this.memory = memory.setValue(mp, byteValue !== undefined ? byteValue.codePointAt(0) as number : -1);
                break;
            }
            case ';':
                this.output.push((Number(memory.getValue(mp) % 256n) + 256) % 256);
                break;

            case '?': {
                const { value, inputPosition } = context.findInteger(this.inputPosition);
                this.inputPosition = inputPosition;
                this.memory = memory.setValue(mp, value);
                break;
            }
            case '!':
                this.output.push(...new TextEncoder().encode(memory.getValue(mp).toString()));
                break;

            // Control flow
            case '_': this.dir = this.dir.reflectAtUnderscore; break;
            case '|': this.dir = this.dir.reflectAtPipe; break;
            case '/': this.dir = this.dir.reflectAtSlash; break;
            case '\\': this.dir = this.dir.reflectAtBackslash; break;
            case '<': this.dir = this.dir.reflectAtLessThan(memory.getValue(mp) > 0); break;
            case '>': this.dir = this.dir.reflectAtGreaterThan(memory.getValue(mp) > 0); break;

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
                    newIp = (Number(memory.getValue(mp) % 6n) + 6) % 6;
                }
                break;

            case '$':
                // When reversing for directional typing, ignore $, because not doing so would make it more confusing.
                if (!context.reverse) {
                    this.handleMovement(context.size);
                }
                break;

            // Digits, letters, and other characters.
            default: {
                const value = opcode.codePointAt(0) as number;
                if (value >= 48 && value <= 57) {
                    const memVal = memory.getValue(mp);
                    this.memory = memory.setValue(mp, memVal * 10n + (memVal < 0 ? -BigInt(opcode) : BigInt(opcode)));
                }
                else {
                    this.memory = memory.setValue(mp, value);
                }
                break;
            }
        }

        if (!context.reverse) {
            this.handleMovement(context.size);
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

    private handleMovement(size: number): void {
        this.coords = this.coords.add(this.dir.vector);

        if (size === 1) {
            this.coords = new PointAxial(0, 0);
            return;
        }

        const x = this.coords.q;
        const z = this.coords.r;
        const y = -x - z;

        if (Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) < size) {
            return;
        }

        const xBigger = Math.abs(x) >= size;
        const yBigger = Math.abs(y) >= size;
        const zBigger = Math.abs(z) >= size;

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
            const isPositive = this.memory.getValue(this.mp) > 0;
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
