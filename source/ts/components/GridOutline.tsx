import React from 'react';
import memoizeOne from 'memoize-one';

import { cellOffsetX, edgeLength } from './GridShared';

const outlineHelper = (x1: number, y1: number, x2: number, y2: number, size: number) =>
    `l ${x1} ${y1}` + `l ${x2} ${y2} l ${x1} ${y1}`.repeat(size - 1);

const getOutlinePath = memoizeOne((size: number) =>
    `m ${-cellOffsetX} ${-edgeLength / 2}` +
    `l ${cellOffsetX} ${-edgeLength / 2} l ${cellOffsetX} ${edgeLength / 2}`.repeat(size) +
    outlineHelper(0, edgeLength, cellOffsetX, edgeLength / 2, size) +
    outlineHelper(-cellOffsetX, edgeLength / 2, 0, edgeLength, size) +
    outlineHelper(-cellOffsetX, -edgeLength / 2, -cellOffsetX, edgeLength / 2, size) +
    outlineHelper(0, -edgeLength, -cellOffsetX, -edgeLength / 2, size) +
    outlineHelper(cellOffsetX, -edgeLength / 2, 0, -edgeLength, size));

type GridOutlineProps = {
    isSecondary: boolean;
    size: number;
    x: number;
    y: number;
}

export class GridOutline extends React.PureComponent<GridOutlineProps> {
    render(): JSX.Element {
        const { isSecondary, size, x, y } = this.props;
        return <path
            className={isSecondary ? 'outlineSecondary' : 'outline'}
            d={getOutlinePath(size)}
            transform={`translate(${x},${y})`}/>;
    }
}
