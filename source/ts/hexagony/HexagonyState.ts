import { List } from 'immutable';

import { Direction, east, northEast, northWest, southEast, southWest, west } from './Direction';
import { createInstuctionPointer, InstructionPointer, updateExecutedGrid, updateInstructionPointer } from './InstructionPointer';
import { Memory } from './Memory';
import { MemoryPointer } from './MemoryPointer';
import { PointAxial } from './PointAxial';
import { HexagonyContext } from './HexagonyContext';
import { rubyStyleDivide, rubyStyleRemainder } from './Util';
import { assertDefined } from '../view/ViewUtil';

export interface EdgeTraversal {
    edgeName: string;
    isBranch: boolean;
}

interface HexagonyStateData {
    activeIp: number;
    edgeTraversals: List<EdgeTraversal>;
    inputPosition: number;
    ips: List<InstructionPointer>;
    memory: Memory;
    mp: MemoryPointer;
    output: List<number>;
    terminationReason: string | null;
    ticks: number;
}

type MovementResult = {
    coords: PointAxial;
    edgeTraversal?: EdgeTraversal;
}

type ExecuteResult = {
    activeIp: number;
    coords: PointAxial;
    dir: Direction;
    edgeTraversal?: EdgeTraversal;
    inputPosition: number;
    memory: Memory;
    mp: MemoryPointer;
    output: List<number>;
    terminationReason: string | null;
};

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
    public readonly memory: Memory;
    public readonly mp: MemoryPointer;
    public readonly activeIp: number;
    public readonly ticks: number;
    public readonly output: List<number>;
    public readonly ips: List<InstructionPointer>;
    public readonly inputPosition: number;
    public readonly terminationReason: string | null;
    public readonly edgeTraversals: List<EdgeTraversal>;

    private constructor(source: HexagonyStateData) {
        this.activeIp = source.activeIp;
        this.edgeTraversals = source.edgeTraversals;
        this.inputPosition = source.inputPosition;
        this.ips = source.ips;
        this.memory = source.memory;
        this.mp = source.mp;
        this.output = source.output;
        this.terminationReason = source.terminationReason;
        this.ticks = source.ticks;
    }

    public static fromContext(context: HexagonyContext): HexagonyState {
        const { size } = context;
        const ips = List([
            createInstuctionPointer(size, new PointAxial(0, -size + 1), east),
            createInstuctionPointer(size, new PointAxial(size - 1, -size + 1), southEast),
            createInstuctionPointer(size, new PointAxial(size - 1, 0), southWest),
            createInstuctionPointer(size, new PointAxial(0, size - 1), west),
            createInstuctionPointer(size, new PointAxial(-size + 1, size - 1), northWest),
            createInstuctionPointer(size, new PointAxial(-size + 1, 0), northEast),
        ]);

        return new HexagonyState({
            activeIp: 0,
            edgeTraversals: List<EdgeTraversal>(),
            inputPosition: 0,
            ips,
            memory: Memory.initialState,
            mp: MemoryPointer.initialState,
            output: List(),
            terminationReason: null,
            ticks: 0,
        });
    }

    get activeIpState(): InstructionPointer {
        return assertDefined(this.ips.get(this.activeIp), 'activeIpState');
    }

    /**
     * Set the value of the current memory edge. Used to determine whether branches are followed for directional typing.
     */
    setMemoryValue(value: bigint | number): HexagonyState {
        return new HexagonyState({
            ...this,
            memory: this.memory.setValue(this.mp, value),
        });
    }

    setIpLocation(coords: PointAxial, dir: Direction): HexagonyState {
        return new HexagonyState({
            ...this,
            ips: this.ips.update(this.activeIp, ip => ({
                coords,
                dir,
                executedGrid: ip.executedGrid,
                // This isn't strictly correct, but it doesn't matter, since it's only used for directional typing.
                executionHistory: ip.executionHistory,
            })),
        });
    }

    step(context: HexagonyContext): HexagonyState {
        if (this.terminationReason) {
            return this;
        }

        let ip = this.activeIpState;
        let { coords, dir } = ip;
        let edgeTraversals = List<EdgeTraversal>();

        if (context.reverse) {
            dir = dir.reverse;
            const result = HexagonyState.handleMovement(context.size, coords, dir, this.memory, this.mp);
            ({ coords } = result);
            if (result.edgeTraversal) {
                edgeTraversals = edgeTraversals.push(result.edgeTraversal);
            }
        }

        const [i, j] = context.axialToIndex(coords);
        ip = updateExecutedGrid(i, j, ip);
        const opcode = context.getInstruction(i, j);
        const executeResult = HexagonyState.executeOpcode(
            opcode,
            context,
            this.activeIp,
            coords,
            dir,
            this.inputPosition,
            this.memory,
            this.mp,
            this.output);

        ({ coords, dir } = executeResult);
        const { activeIp, inputPosition, memory, mp, output, terminationReason } = executeResult;

        if (executeResult.edgeTraversal) {
            edgeTraversals = edgeTraversals.push(executeResult.edgeTraversal);
        }

        if (context.reverse) {
            dir = dir.reverse;
        }

        // The active coordinates don't change when the program terminates.
        if (terminationReason === null) {
            if (!context.reverse) {
                const result = HexagonyState.handleMovement(context.size, coords, dir, memory, mp);
                ({ coords } = result);
                if (result.edgeTraversal) {
                    edgeTraversals = edgeTraversals.push(result.edgeTraversal);
                }
            }

            const [i, j] = context.axialToIndex(coords);
            ip = updateInstructionPointer(coords, dir, i, j, ip);
        }

        return new HexagonyState({
            activeIp,
            edgeTraversals,
            inputPosition,
            ips: this.ips.set(this.activeIp, ip),
            memory,
            mp,
            output,
            terminationReason,
            ticks: this.ticks + 1,
        });
    }

    private static executeOpcode(
        opcode: string,
        context: HexagonyContext,
        activeIp: number,
        coords: PointAxial,
        dir: Direction,
        inputPosition: number,
        memory: Memory,
        mp: MemoryPointer,
        output: List<number>): ExecuteResult {
        // Execute the current instruction
        let newIp = activeIp;
        let edgeTraversal: EdgeTraversal | undefined = undefined;

        switch (opcode) {
            // NOP
            case '.': break;

            // Terminate
            case '@':
                return {
                    activeIp,
                    coords,
                    dir,
                    inputPosition,
                    memory,
                    mp,
                    output,
                    terminationReason: 'Program terminated at @.',
                };

            // Arithmetic
            case ')':
                memory = memory.setValue(mp, memory.getValue(mp) + 1n);
                break;
            case '(':
                memory = memory.setValue(mp, memory.getValue(mp) - 1n);
                break;
            case '+':
                memory = memory.setValue(mp, memory.getValue(mp.moveLeft()) + memory.getValue(mp.moveRight()));
                break;
            case '-':
                memory = memory.setValue(mp, memory.getValue(mp.moveLeft()) - memory.getValue(mp.moveRight()));
                break;
            case '*':
                memory = memory.setValue(mp, memory.getValue(mp.moveLeft()) * memory.getValue(mp.moveRight()));
                break;
            case '~':
                memory = memory.setValue(mp, -memory.getValue(mp));
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
                        return {
                            activeIp,
                            coords,
                            dir,
                            inputPosition,
                            memory,
                            mp,
                            output,
                            terminationReason: 'Error: Program terminated due to division by zero.',
                        };
                    }
                }
                if (execute) {
                    memory = memory.setValue(
                        mp,
                        opcode === ':' ?
                            rubyStyleDivide(leftVal, rightVal) :
                            rubyStyleRemainder(leftVal, rightVal));
                }
                break;
            }
            // Memory manipulation
            case '{': mp = mp.moveLeft(); break;
            case '}': mp = mp.moveRight(); break;
            case '=': mp = mp.reverse(); break;
            case '"': mp = mp.moveRight(true); break;
            case '\'': mp = mp.moveLeft(true); break;
            case '^':
                mp = memory.getValue(mp) > 0 ?
                    mp.moveRight() :
                    mp.moveLeft();
                break;
            case '&':
                memory = memory.setValue(
                    mp,
                    memory.getValue(mp) > 0 ?
                        memory.getValue(mp.moveRight()) :
                        memory.getValue(mp.moveLeft()));
                break;

            case ',': {
                const byteValue = context.getInputByte(inputPosition++);
                memory = memory.setValue(mp, byteValue !== undefined ? byteValue.codePointAt(0) as number : -1);
                break;
            }
            case ';':
                output = output.push((Number(memory.getValue(mp) % 256n) + 256) % 256);
                break;

            case '?': {
                const result = context.findInteger(inputPosition);
                ({ inputPosition } = result);
                memory = memory.setValue(mp, result.value);
                break;
            }
            case '!':
                output = output.push(...new TextEncoder().encode(memory.getValue(mp).toString()));
                break;

            // Control flow
            case '_': dir = dir.reflectAtUnderscore; break;
            case '|': dir = dir.reflectAtPipe; break;
            case '/': dir = dir.reflectAtSlash; break;
            case '\\': dir = dir.reflectAtBackslash; break;
            case '<': dir = dir.reflectAtLessThan(memory.getValue(mp) > 0); break;
            case '>': dir = dir.reflectAtGreaterThan(memory.getValue(mp) > 0); break;

            case ']':
                if (!context.isDirectionalTypingSimulation) {
                    newIp = (activeIp + 1) % 6;
                }
                break;

            case '[':
                if (!context.isDirectionalTypingSimulation) {
                    newIp = (activeIp + 5) % 6;
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
                    ({ coords, edgeTraversal } =
                        HexagonyState.handleMovement(context.size, coords, dir, memory, mp));
                }
                break;

            // Digits, letters, and other characters.
            default: {
                const value = opcode.codePointAt(0) as number;
                if (value >= 48 && value <= 57) {
                    const memVal = memory.getValue(mp);
                    memory = memory.setValue(mp, memVal * 10n + (memVal < 0 ? -BigInt(opcode) : BigInt(opcode)));
                }
                else {
                    memory = memory.setValue(mp, value);
                }
                break;
            }
        }

        return {
            activeIp: newIp,
            coords,
            dir,
            edgeTraversal,
            inputPosition,
            memory,
            mp,
            output,
            terminationReason: null,
        };
    }

    private static edgeTraversal(coords: PointAxial, dir: Direction, edgeType = '0', isBranch = false): EdgeTraversal {
        return {
            edgeName: `${coords},${dir},${edgeType}`,
            isBranch,
        };
    }

    private static handleMovement(
        size: number,
        coords: PointAxial,
        dir: Direction,
        memory: Memory,
        mp: MemoryPointer): MovementResult {
        const newCoords = coords.add(dir.vector);

        if (size === 1) {
            return { coords: new PointAxial(0, 0) };
        }

        const x = newCoords.q;
        const z = newCoords.r;
        const y = -x - z;

        if (Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) < size) {
            return { coords: newCoords };
        }

        const xBigger = Math.abs(x) >= size;
        const yBigger = Math.abs(y) >= size;
        const zBigger = Math.abs(z) >= size;

        // If two values are still in range, we are wrapping around an edge (not a corner).
        if (!xBigger && !yBigger) {
            return {
                coords: new PointAxial(coords.q + coords.r, -coords.r),
                edgeTraversal: HexagonyState.edgeTraversal(coords, dir),
            };
        }
        else if (!yBigger && !zBigger) {
            return {
                coords: new PointAxial(-coords.q, coords.q + coords.r),
                edgeTraversal: HexagonyState.edgeTraversal(coords, dir),
            };
        }
        else if (!zBigger && !xBigger) {
            return {
                coords: new PointAxial(-coords.r, -coords.q),
                edgeTraversal: HexagonyState.edgeTraversal(coords, dir),
            };
        }
        else {
            // If two values are out of range, we navigated into a corner.
            // We teleport to a location that depends on the current memory value.
            const isPositive = memory.getValue(mp) > 0;
            const edgeTraversal = HexagonyState.edgeTraversal(coords, dir, isPositive ? '+' : '-', true);

            if (!xBigger && !isPositive || !yBigger && isPositive) {
                return {
                    coords: new PointAxial(coords.q + coords.r, -coords.r),
                    edgeTraversal,
                };
            }
            else if (!yBigger || !zBigger && isPositive) {
                return {
                    coords: new PointAxial(-coords.q, coords.q + coords.r),
                    edgeTraversal,
                };
            }

            return {
                coords: new PointAxial(-coords.r, -coords.q),
                edgeTraversal,
            };
        }
    }
}
