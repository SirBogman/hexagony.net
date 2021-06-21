import React from 'react';
import { MemoryPointer } from '../hexagony/MemoryPointer';

export const edgeLength = 46.24 * 1.4;
export const halfEdgeLength = 0.5 * edgeLength;
const cellHeight = 2 * edgeLength;
const cellOffsetY = 3 / 4 * cellHeight;
const cellOffsetX = Math.sqrt(3) / 2 * edgeLength;

export const xFactor = 0.5 * cellOffsetX;
export const yFactor = 0.5 * cellOffsetY;

export function getMPAngle(mp: MemoryPointer): number {
    return mp.dir.angle + (mp.cw ? 180 : 0);
}

export function getMPCoordinates(mp: MemoryPointer): readonly [number, number] {
    return [mp.x * xFactor, mp.y * yFactor];
}

interface IMemoryHexagonGrid {
    x: number;
    y: number;
    rows: number;
    columns: number;
}

/**
 * Renders a hexagonal grid for the background of the memory grid.
 * @component
 */
export class MemoryHexagonGrid extends React.PureComponent<IMemoryHexagonGrid> {
    render(): JSX.Element {
        const { rows, columns } = this.props;
        let path = '';
        const startX = (2 * this.props.x - 1.5 + this.props.y % 2) * cellOffsetX;
        const startY = (this.props.y + 0.5) * cellOffsetY - halfEdgeLength;
        let x = 0;
        let y = 0;
        const makeEdge = (isNorthWest: boolean) => {
            x += cellOffsetX;
            y += isNorthWest ? -halfEdgeLength : halfEdgeLength;
            return `L${x.toFixed(2)} ${y.toFixed(2)}`;
        };

        for (let i = 0; i < rows + 1; i++) {
            const rowY = startY + cellOffsetY * i;

            // NW and NE edges
            const isLastEvenRow = i === rows && i % 2 === 0;
            const isLastOddRow = i === rows && i % 2 !== 0;
            x = startX + (isLastEvenRow ? cellOffsetX : 0);
            y = rowY - (i % 2 + Number(isLastEvenRow)) * halfEdgeLength;
            path += `M${x.toFixed(2)} ${y.toFixed(2)}`;
            if (i % 2) {
                path += makeEdge(false);
            }
            for (let j = 0; j < columns; j++) {
                // Don't draw an extra line segment in the bottom left, if there's an even number of rows.
                if (j || !isLastEvenRow) {
                    path += makeEdge(true);
                }

                // Don't draw an extra line segment in the bottom right, if there's an odd number of rows.
                if (j < columns - 1 || !isLastOddRow) {
                    path += makeEdge(false);
                }
            }

            if (i !== 0 && i % 2 === 0) {
                path += makeEdge(true);
            }

            // Vertical lines
            if (i < rows) {
                for (let j = 0; j < columns + 1; j++) {
                    path += `M${(startX + cellOffsetX * (i % 2) + j * cellOffsetX * 2).toFixed(2)} ` +
                        `${rowY.toFixed(2)}v${edgeLength.toFixed(2)}`;
                }
            }
        }

        return <path className="memoryCell" d={path}/>;
    }
}
