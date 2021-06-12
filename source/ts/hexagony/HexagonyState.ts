import { List, set, update } from 'immutable';

import { Direction, east, northEast, northWest, southEast, southWest, west } from './Direction';
import { createInstuctionPointer, InstructionPointer, updateExecutedGrid, updateInstructionPointer } from './InstructionPointer';
import { Memory } from './Memory';
import { MemoryPointer } from './MemoryPointer';
import { PointAxial } from './PointAxial';
import { HexagonyContext } from './HexagonyContext';
import { rubyStyleDivide, rubyStyleRemainder } from './Util';

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
export type HexagonyState = {
    readonly memory: Memory;
    readonly mp: MemoryPointer;
    readonly activeIp: number;
    readonly ticks: number;
    readonly output: List<number>;
    readonly ips: InstructionPointer[];
    readonly inputPosition: number;
    readonly terminationReason: string | null;
    readonly edgeTraversals: EdgeTraversal[];
};

export class HexagonyStateUtils {
    public static fromContext = ({ size }: HexagonyContext): HexagonyState => ({
        activeIp: 0,
        edgeTraversals: [],
        inputPosition: 0,
        ips: [
            createInstuctionPointer(size, new PointAxial(0, -size + 1), east),
            createInstuctionPointer(size, new PointAxial(size - 1, -size + 1), southEast),
            createInstuctionPointer(size, new PointAxial(size - 1, 0), southWest),
            createInstuctionPointer(size, new PointAxial(0, size - 1), west),
            createInstuctionPointer(size, new PointAxial(-size + 1, size - 1), northWest),
            createInstuctionPointer(size, new PointAxial(-size + 1, 0), northEast),
        ],
        memory: Memory.initialState,
        mp: MemoryPointer.initialState,
        output: List(),
        terminationReason: null,
        ticks: 0,
    });

    public static activeIpState = (state: HexagonyState): InstructionPointer =>
        state.ips[state.activeIp];

    /**
     * Set the value of the current memory edge. Used to determine whether branches are followed for directional typing.
     */
    public static setMemoryValue = (state: HexagonyState, value: bigint | number): HexagonyState => ({
        ...state,
        memory: state.memory.setValue(state.mp, value),
    });

    public static setIpLocation = (state: HexagonyState, coords: PointAxial, dir: Direction): HexagonyState => ({
        ...state,
        ips: update(state.ips, state.activeIp, ip => ({
            coords,
            dir,
            executedGrid: ip.executedGrid,
            // Technically, executionHistory should be updated, but it doesn't matter,
            // since this method is only used for directional typing.
            executionHistory: ip.executionHistory,
        })),
    });

    public static step(state: HexagonyState, context: HexagonyContext): HexagonyState {
        if (state.terminationReason) {
            return state;
        }

        let { activeIp, inputPosition, memory, mp, output } = state;
        let ip = state.ips[activeIp];
        let { coords, dir } = ip;
        const edgeTraversals: EdgeTraversal[] = [];

        if (context.reverse) {
            dir = dir.reverse;
            coords = HexagonyStateUtils.handleMovement(context.size, coords, dir, memory, mp, edgeTraversals);
        }

        let [i, j] = context.axialToIndex(coords);
        ip = updateExecutedGrid(i, j, ip);
        const opcode = context.getInstruction(i, j);

        // Execute the current instruction
        switch (opcode) {
            // NOP
            case '.': break;

            // Terminate
            case '@':
                return {
                    ...state,
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
                            ...state,
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
                    activeIp = (activeIp + 1) % 6;
                }
                break;

            case '[':
                if (!context.isDirectionalTypingSimulation) {
                    activeIp = (activeIp + 5) % 6;
                }
                break;

            case '#':
                if (!context.isDirectionalTypingSimulation) {
                    activeIp = (Number(memory.getValue(mp) % 6n) + 6) % 6;
                }
                break;

            case '$':
                // When reversing for directional typing, ignore $, because not doing so would make it more confusing.
                if (!context.reverse) {
                    coords = HexagonyStateUtils.handleMovement(context.size, coords, dir, memory, mp, edgeTraversals);
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

        if (context.reverse) {
            dir = dir.reverse;
        }
        else {
            coords = HexagonyStateUtils.handleMovement(context.size, coords, dir, memory, mp, edgeTraversals);
        }

        [i, j] = context.axialToIndex(coords);
        ip = updateInstructionPointer(coords, dir, i, j, ip);

        return {
            activeIp,
            edgeTraversals,
            inputPosition,
            ips: set(state.ips, state.activeIp, ip),
            memory,
            mp,
            output,
            terminationReason: null,
            ticks: state.ticks + 1,
        };
    }

    private static edgeTraversal = (coords: PointAxial, dir: Direction, edgeType = '0', isBranch = false): EdgeTraversal => ({
        edgeName: `${coords},${dir},${edgeType}`,
        isBranch,
    });

    private static handleMovement(
        size: number,
        coords: PointAxial,
        dir: Direction,
        memory: Memory,
        mp: MemoryPointer,
        edgeTraversals: EdgeTraversal[]): PointAxial {
        const newCoords = coords.add(dir.vector);

        if (size === 1) {
            return new PointAxial(0, 0);
        }

        const x = newCoords.q;
        const z = newCoords.r;
        const y = -x - z;

        if (Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) < size) {
            return newCoords;
        }

        const xBigger = Math.abs(x) >= size;
        const yBigger = Math.abs(y) >= size;
        const zBigger = Math.abs(z) >= size;

        // If two values are still in range, we are wrapping around an edge (not a corner).
        if (!xBigger && !yBigger) {
            edgeTraversals.push(HexagonyStateUtils.edgeTraversal(coords, dir));
            return new PointAxial(coords.q + coords.r, -coords.r);
        }
        else if (!yBigger && !zBigger) {
            edgeTraversals.push(HexagonyStateUtils.edgeTraversal(coords, dir));
            return new PointAxial(-coords.q, coords.q + coords.r);
        }
        else if (!zBigger && !xBigger) {
            edgeTraversals.push(HexagonyStateUtils.edgeTraversal(coords, dir));
            return new PointAxial(-coords.r, -coords.q);
        }
        else {
            // If two values are out of range, we navigated into a corner.
            // We teleport to a location that depends on the current memory value.
            const isPositive = memory.getValue(mp) > 0;
            edgeTraversals.push(HexagonyStateUtils.edgeTraversal(coords, dir, isPositive ? '+' : '-', true));

            if (!xBigger && !isPositive || !yBigger && isPositive) {
                return new PointAxial(coords.q + coords.r, -coords.r);
            }
            else if (!yBigger || !zBigger && isPositive) {
                return new PointAxial(-coords.q, coords.q + coords.r);
            }

            return new PointAxial(-coords.r, -coords.q);
        }
    }
}
