import React from 'react';
import { northEast, southEast } from '../hexagony/Direction';
import { Memory } from '../hexagony/Memory';
import { MemoryEdge } from './MemoryEdge';

interface IMemoryEdgesProps {
    memory: Memory;
    showValues: boolean;
}

/**
 * Renders all values that are set on edges in the memory grid.
 * The primary purpose of this component is to avoid rendering
 * the memory edges, unless the memory data version has changed.
 * @component
 */
export class MemoryEdges extends React.Component<IMemoryEdgesProps> {
    lastDataVersion = -1;

    render(): JSX.Element {
        const { memory, showValues } = this.props;
        this.lastDataVersion = memory.dataVersion;
        const cells = [];
        for (const { x, y, dir, value } of memory.iterateData()) {
            const angle = dir === northEast ? 30 : dir === southEast ? -30 : -90;
            cells.push(<MemoryEdge key={`${x},${y}`} x={x} y={y} angle={angle} value={showValues ? value : undefined}/>);
        }
        return <g>{cells}</g>;
    }

    shouldComponentUpdate(nextProps: IMemoryEdgesProps): boolean {
        return nextProps.memory.dataVersion !== this.lastDataVersion;
    }
}
