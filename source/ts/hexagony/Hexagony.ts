import { Direction, east, northEast, northWest, southEast, southWest, west } from './Direction';
import { Grid } from './Grid';
import { Memory } from './Memory';
import { PointAxial } from './PointAxial';
import { ISourceCode } from './SourceCode';
import { indexToAxial, rubyStyleDivide, rubyStyleRemainder } from './Util';

export class Hexagony {
    public memory: Memory;
    public activeIp = 0;
    public ticks = 0;
    public output: number[] = [];

    private grid: Grid;
    private size: number;
    private inputPosition = 0;
    private edgeEventHandler: ((edgeName: string, isBranch: boolean) => void) | null;
    private ips: PointAxial[];
    private ipDirs: Direction[];
    private input: string[];
    private firstStepNoop = false;
    private isDirectionalTypingSimulation = false;
    private reverse = false;
    private generator: Generator;
    private terminationReason: string | null = null;

    constructor(
        sourceCode: ISourceCode,
        inputString = '',
        edgeEventHandler: ((edgeName: string, isBranch: boolean) => void) | null = null) {
        this.grid = new Grid(sourceCode);
        this.size = this.grid.size;
        this.memory = new Memory();
        this.input = [...inputString];
        this.edgeEventHandler = edgeEventHandler;
        this.ips = [
            new PointAxial(0, -this.size + 1),
            new PointAxial(this.size - 1, -this.size + 1),
            new PointAxial(this.size - 1, 0),
            new PointAxial(0, this.size - 1),
            new PointAxial(-this.size + 1, this.size - 1),
            new PointAxial(-this.size + 1, 0),
        ];
        this.ipDirs = [east, southEast, southWest, west, northWest, northEast];
        this.generator = this.execute();
    }

    axialToIndex(coords: PointAxial): [number, number] {
        return this.grid.axialToIndex(coords);
    }

    indexToAxial(i: number, j: number): PointAxial {
        return indexToAxial(this.size, i, j);
    }

    getTerminationReason(): string | null {
        return this.terminationReason;
    }

    /**
     * Prevents the initial call to step from executing an instruction. This allows the first instruction to be
     * highlighted in the UI before it's executed.
     */
    setFirstStepNoop(): void {
        this.firstStepNoop = true;
    }

    /**
     * Indicate that code is being simulated to support directional typing.
     */
    setDirectionalTypingSimulation(): void {
        this.isDirectionalTypingSimulation = true;
    }

    /**
     * Set the value of the current memory edge. Used to determine whether branches are followed for directional typing.
     */
    setMemoryValue(value: bigint | number): void {
        this.memory.setValue(value);
    }

    setSourceCode(sourceCode: ISourceCode): void {
        this.grid.setSourceCode(sourceCode);
    }

    setInput(inputString: string): void {
        this.input = [...inputString];
    }

    getExecutedGrid(): Direction[][][][] {
        return this.grid.getExecutedGrid();
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

    step(reverse = false): void {
        if (reverse) {
            this.dir = this.dir.reverse;
            this.reverse = true;
            this.generator.next();
            this.reverse = false;
            this.dir = this.dir.reverse;
        }
        else {
            this.generator.next();
        }
    }

    private * execute(): Generator {
        while (!this.terminationReason) {
            if (this.firstStepNoop || this.ticks) {
                yield;
            }

            if (this.reverse) {
                this.handleMovement();
            }

            const opcode = this.grid.getInstruction(this.coords, this.dir, this.activeIp);
            this.executeOpcode(opcode);
        }
    }

    private executeOpcode(opcode: string): void {
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
                    if (this.isDirectionalTypingSimulation) {
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
                const byteValue = this.readByte();
                this.memory.setValue(byteValue !== undefined ? byteValue.codePointAt(0) as number : -1);
                break;
            }
            case ';':
                this.output.push((Number(this.memory.getValue() % 256n) + 256) % 256);
                break;

            case '?':
                this.memory.setValue(this.findInteger());
                break;

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
                if (!this.isDirectionalTypingSimulation) {
                    newIp = (this.activeIp + 1) % 6;
                }
                break;

            case '[':
                if (!this.isDirectionalTypingSimulation) {
                    newIp = (this.activeIp + 5) % 6;
                }
                break;

            case '#':
                if (!this.isDirectionalTypingSimulation) {
                    newIp = (Number(this.memory.getValue() % 6n) + 6) % 6;
                }
                break;

            case '$':
                // When reversing for directional typing, ignore $, because not doing so would make it more confusing.
                if (!this.reverse) {
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

        if (!this.reverse) {
            this.handleMovement();
        }
        this.activeIp = newIp;
        this.ticks++;
    }

    private followEdge(edgeType = '0', isBranch = false): void {
        if (this.edgeEventHandler) {
            this.edgeEventHandler(`${this.coords},${this.dir},${edgeType}`, isBranch);
        }
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

    private findInteger(): bigint {
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
            const codePoint = byteValue.codePointAt(0) as number;
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
            const codePoint = byteValue.codePointAt(0) as number;
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

    private peekByte(): string | undefined {
        return this.inputPosition < this.input.length ? this.input[this.inputPosition] : undefined;
    }

    private readByte(): string | undefined {
        return this.inputPosition < this.input.length ? this.input[this.inputPosition++] : undefined;
    }
}
