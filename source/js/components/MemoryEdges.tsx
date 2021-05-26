import React from 'react';
import PropTypes from 'prop-types';
import { northEast, southEast } from '../hexagony/Direction';
import { Memory } from '../hexagony/Memory';
import { MemoryEdge } from './MemoryEdge';

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
    lastDataVersion: number;

    constructor(props: IMemoryEdgesProps) {
        super(props);
        this.lastDataVersion = -1;
    }

    render(): JSX.Element {
        const { memory } = this.props;
        this.lastDataVersion = memory.dataVersion;
        const cells = memory.getDataArray().map(entry => {
            const { x, y, dir, value } = entry;
            const angle = dir === northEast ? 30 : dir === southEast ? -30 : -90;
            return <MemoryEdge key={`${x},${y}`} x={x} y={y} angle={angle} value={value}/>;
        });

        return <g>{cells}</g>;
    }

    shouldComponentUpdate(nextProps: IMemoryEdgesProps): boolean {
        return nextProps.memory.dataVersion !== this.lastDataVersion;
    }

    static propTypes = {
        memory: PropTypes.object.isRequired,
    };
}
