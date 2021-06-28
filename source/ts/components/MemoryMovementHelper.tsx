import React from 'react';

import { MemoryPointer } from '../hexagony/MemoryPointer';

import { getMPAngle, getMPCoordinates, MemoryHexagonGrid } from './MemoryHexagonGrid';
import { MemoryPointerView } from './MemoryPointerView';
import { MemoryEdgeLargeText } from './MemoryEdge';

import '../../styles/MemoryPanel.scss';

export const MemoryMovementHelper: React.FC = () => {
    const width = 375;
    const height = 375;
    const centerX = width / 2;
    const centerY = height / 2;
    let [offsetX, offsetY] = getMPCoordinates(MemoryPointer.initialState);
    offsetX = centerX - offsetX;
    offsetY = centerY - offsetY;

    const memoryPointerViews = [];
    const memoryEdgeViews = [];

    const memoryPointers: readonly (readonly [MemoryPointer, string])[] = [
        [MemoryPointer.initialState, ''],
        [MemoryPointer.initialState.moveLeft(), '{'],
        [MemoryPointer.initialState.moveRight(), '}'],
        [MemoryPointer.initialState.moveBackLeft(), '"'],
        [MemoryPointer.initialState.moveBackRight(), '\''],
    ];

    for (const [mp, text] of memoryPointers) {
        const [x, y] = getMPCoordinates(mp);
        const angle = getMPAngle(mp);
        memoryEdgeViews.push(<MemoryEdgeLargeText x={x + offsetX} y={y + offsetY} text={text}/>);
        // Make the memory points slightly smaller so that they don't intersect.
        memoryPointerViews.push(
            <MemoryPointerView x={x + offsetX} y={y + offsetY} angle={angle} delay="0" scale={0.9}/>);
    }

    return (
        <svg width={width} height={height}>
            <rect width={width} height={height} className="svgBackground"/>
            <g transform={`translate(${offsetX},${offsetY})`}>
                <MemoryHexagonGrid x={-1} y={-2} columns={5} rows={5}/>
            </g>
            {memoryEdgeViews}
            {memoryPointerViews}
        </svg>
    );
};
