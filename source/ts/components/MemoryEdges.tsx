import React from 'react';
import { Memory } from '../hexagony/Memory';
import { MemoryEdge } from './MemoryEdge';
import { getMemoryEdgeAngle, xFactor, yFactor } from './MemoryHexagonGrid';

interface IMemoryEdgesProps {
    memory: Memory;
}

/**
 * Renders all values that are set on edges in the memory grid.
 * The primary purpose of this component is to avoid rendering
 * the memory edges, unless the memory data version has changed.
 * @component
 */
export class MemoryEdges extends React.Component<IMemoryEdgesProps> {
    lastDataVersion = -1;

    override render(): JSX.Element {
        const { memory } = this.props;
        this.lastDataVersion = memory.dataVersion;
        const cells = [];
        for (const { x, y, dir, value } of memory.iterateData()) {
            const angle = getMemoryEdgeAngle(dir);
            cells.push(<MemoryEdge key={`${x},${y}`} x={x * xFactor} y={y * yFactor} angle={angle} value={value}/>);
        }
        return <g>{cells}</g>;
    }

    override shouldComponentUpdate(nextProps: IMemoryEdgesProps): boolean {
        return nextProps.memory.dataVersion !== this.lastDataVersion;
    }
}
