import React from 'react';
import { MemoryEdges } from './MemoryEdges';
import { getMPCoordinates, MemoryHexagonGrid } from './MemoryHexagonGrid';
import { Memory } from '../hexagony/Memory';
import { MemoryPointer } from '../hexagony/MemoryPointer';
import { MemoryPointerView } from './MemoryPointerView';
import { assertNotNull } from '../view/ViewUtil';

function roundGridValueLowerBound(value: number) {
    // Testing: [...Array(30)].fill(null).map((x,i) => i).map(x => roundGridValueUpperBound(x) - x);
    // The difference between x and (Math.ceil(value / 5) - 3) * 5 and x is between 11 and 15.
    return (Math.ceil(value / 5) - 3) * 5;
}

function roundGridValueUpperBound(value: number) {
    // Testing: [...Array(30)].fill(null).map((x,i) => i).map(x => (Math.floor(x / 5) + 3) * 5 - x);
    // The difference between (Math.floor(value / 5) + 3) * 5 and x is between 11 and 15.
    return (Math.floor(value / 5) + 3) * 5;
}

interface IMemoryViewProps {
    memory: Memory;
    mp: MemoryPointer;
    delay: string;
}

/**
 * Represents view of Hexagony's memory grid.
 * @component
 */
export class MemoryView extends React.Component<IMemoryViewProps> {
    viewRef: React.RefObject<SVGSVGElement> = React.createRef();

    getSvg(): SVGSVGElement {
        return assertNotNull(this.viewRef.current, 'MemoryView.viewRef');
    }

    render(): JSX.Element {
        const { delay, memory, mp } = this.props;
        if (!memory) {
            return <svg ref={this.viewRef}/>;
        }

        const [x, y] = getMPCoordinates(mp);
        const angle = mp.dir.angle + (mp.cw ? 180 : 0);

        return (
            <svg overflow="visible" ref={this.viewRef}>
                {this.renderHexagonGrid()}
                <MemoryEdges memory={memory}/>
                <MemoryPointerView x={x} y={y} angle={angle} delay={delay}/>
            </svg>
        );
    }

    renderHexagonGrid(): JSX.Element {
        const { memory, mp } = this.props;
        const currentX = mp.x;
        const currentY = mp.y;
        const minX = memory.minX !== undefined ? Math.min(memory.minX, currentX) : currentX;
        const minY = memory.minY !== undefined ? Math.min(memory.minY, currentY) : currentY;
        const maxX = memory.maxX !== undefined ? Math.max(memory.maxX, currentX) : currentX;
        const maxY = memory.maxY !== undefined ? Math.max(memory.maxY, currentY) : currentY;

        // Coordinates for the center hexagon:
        // E edge: 1, 1
        // NE edge: 0, 0
        // NW edge: -2, 0
        // W edge: -3, 1
        // SW edge: -2, -2
        // SE edge: 0, 2
        // Figure out how many hexagons are needed based on these coordinates.
        const x1 = roundGridValueLowerBound(Math.floor((minX + 3) / 4));
        const x2 = roundGridValueUpperBound(Math.floor((maxX + 3) / 4));
        const y1 = roundGridValueLowerBound(Math.floor((minY - 1) / 2));
        const y2 = roundGridValueUpperBound(Math.floor((maxY - 1) / 2));

        // Render the background as a single path. If rendered as more than one path, you can sometimes see seams between the parts.
        return <MemoryHexagonGrid x={x1} y={y1} columns={x2 - x1 + 1} rows={y2 - y1 + 1}/>;
    }
}
