import { List } from 'immutable';

import { Direction } from './Direction';
import { HexagonyContext } from './HexagonyContext';
import { EdgeTraversal, HexagonyState, HexagonyStateUtils } from './HexagonyState';
import { InstructionPointer } from './InstructionPointer';
import { Memory } from './Memory';
import { PointAxial } from './PointAxial';
import { ISourceCode } from './SourceCode';

const maximumHistory = 100;

export class Hexagony {
    private previousStates = List<HexagonyState>();
    public state: HexagonyState;
    private context: HexagonyContext;

    constructor(
        sourceCode: ISourceCode,
        inputString = '') {
        this.context = new HexagonyContext(sourceCode, inputString);
        this.state = HexagonyStateUtils.fromContext(this.context);
    }

    axialToIndex(coords: PointAxial): [number, number] {
        return this.context.axialToIndex(coords);
    }

    setSourceCode(sourceCode: ISourceCode): void {
        this.context.setSourceCode(sourceCode);
    }

    setInput(inputString: string): void {
        this.context.setInput(inputString);
    }

    get edgeTraversals(): List<EdgeTraversal> {
        return this.state.edgeTraversals;
    }

    get activeIp(): number {
        return this.state.activeIp;
    }

    get activeIpState(): InstructionPointer {
        return HexagonyStateUtils.activeIpState(this.state);
    }

    get dir(): Direction {
        return this.activeIpState.dir;
    }

    get coords(): PointAxial {
        return this.activeIpState.coords;
    }

    get ips(): List<InstructionPointer> {
        return this.state.ips;
    }

    get memory(): Memory {
        return this.state.memory;
    }

    get output(): List<number> {
        return this.state.output;
    }

    get terminationReason(): string | null {
        return this.state.terminationReason;
    }

    get ticks(): number {
        return this.state.ticks;
    }

    step(): void {
        if (this.previousStates.size === maximumHistory) {
            this.previousStates = this.previousStates.shift();
        }

        this.previousStates = this.previousStates.push(this.state);
        this.state = HexagonyStateUtils.step(this.state, this.context);
    }

    stepBack(): void {
        const previousState = this.previousStates.last(undefined);
        if (previousState !== undefined) {
            this.previousStates = this.previousStates.pop();
            this.state = previousState;
        }
    }
}
