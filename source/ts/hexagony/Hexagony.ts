//import { produce } from 'immer';

import { Direction } from './Direction';
import { HexagonyContext } from './HexagonyContext';
import { EdgeTraversal, HexagonyState } from './HexagonyState';
import { Memory } from './Memory';
import { PointAxial } from './PointAxial';
import { ISourceCode } from './SourceCode';

//const maximumHistory = 100;

export class Hexagony {
    private previousStates: HexagonyState[] = [];
    public state: HexagonyState;
    private context: HexagonyContext;

    constructor(
        sourceCode: ISourceCode,
        inputString = '') {
        this.state = new HexagonyState(sourceCode.size);
        this.context = new HexagonyContext(sourceCode, inputString);
    }

    axialToIndex(coords: PointAxial): [number, number] {
        return this.state.axialToIndex(coords);
    }

    setSourceCode(sourceCode: ISourceCode): void {
        this.context.setSourceCode(sourceCode);
    }

    setInput(inputString: string): void {
        this.context.setInput(inputString);
    }

    get edgeTraversals(): EdgeTraversal[] {
        return this.state.edgeTraversals;
    }

    get executionHistory(): [number, number, Direction][][] {
        return this.state.executionHistory;
    }

    get executedGrid(): Direction[][][][] {
        return this.state.executedGrid;
    }

    getIPState(ipIndex: number): [PointAxial, Direction] {
        return [this.ips[ipIndex], this.ipDirs[ipIndex]];
    }

    get activeIp(): number {
        return this.state.activeIp;
    }

    get dir(): Direction {
        return this.state.dir;
    }

    get coords(): PointAxial {
        return this.state.coords;
    }

    get ipDirs(): Direction[] {
        return this.state.ipDirs;
    }

    get ips(): PointAxial[] {
        return this.state.ips;
    }

    get memory(): Memory {
        return this.state.memory;
    }

    get output(): number[] {
        return this.state.output;
    }

    get terminationReason(): string | null {
        return this.state.terminationReason;
    }

    get ticks(): number {
        return this.state.ticks;
    }

    step(): void {
        //this.previousStates = [...this.previousStates.slice(0, maximumHistory), this.state];
        // TODO: calling the edge transition callback inside of produce may lead to duplicate calls.
        // most likely that doesn't matter though, because nothing different will happen when triggering
        // the animation twice in a row.
        //this.state = produce(this.state, (state: HexagonyState) => { state.step(this.context); });
        this.state.step(this.context);
    }
}
