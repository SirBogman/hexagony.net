import { Direction } from '../hexagony/Direction';
import { EdgeTraversal } from '../hexagony/HexagonyState';

export interface IUndoItem {
    readonly codeChangeContext: CodeChangeContext | null;
    readonly isSizeChange: boolean;
    readonly oldCode: string;
    readonly newCode: string;
}

export type CodeChangeContext = {
    readonly edgeTraversal?: EdgeTraversal;
    readonly direction?: Direction;
    readonly i: number;
    readonly j: number;
    readonly newDirection?: Direction;
    readonly newI?: number;
    readonly newJ?: number;
    readonly synchronizedExecutionTicks?: number;
};

export type CodeChangeCallback = (char: string, codeChangeContext: CodeChangeContext) => void;
