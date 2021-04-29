import React from 'react';
import PropTypes from 'prop-types';
import memoizeOne from 'memoize-one';

import { cellOffsetX, edgeLength } from './GridShared.jsx';

const outlineHelper = (x1, y1, x2, y2, size) =>
    `l ${x1} ${y1}` + `l ${x2} ${y2} l ${x1} ${y1}`.repeat(size - 1);

const getOutlinePath = memoizeOne(size =>
    `m ${-cellOffsetX} ${-edgeLength / 2}` +
    `l ${cellOffsetX} ${-edgeLength / 2} l ${cellOffsetX} ${edgeLength / 2}`.repeat(size) +
    outlineHelper(0, edgeLength, cellOffsetX, edgeLength / 2, size) +
    outlineHelper(-cellOffsetX, edgeLength / 2, 0, edgeLength, size) +
    outlineHelper(-cellOffsetX, -edgeLength / 2, -cellOffsetX, edgeLength / 2, size) +
    outlineHelper(0, -edgeLength, -cellOffsetX, -edgeLength / 2, size) +
    outlineHelper(cellOffsetX, -edgeLength / 2, 0, -edgeLength, size));

export class GridOutline extends React.PureComponent {
    render() {
        const { isSecondary, size, x, y } = this.props;
        return <path
            className={isSecondary ? 'outlineSecondary' : 'outline'}
            d={getOutlinePath(size)}
            transform={`translate(${x},${y})`}/>;
    }

    static propTypes = {
        isSecondary: PropTypes.bool.isRequired,
        size: PropTypes.number.isRequired,
        x: PropTypes.number.isRequired,
        y: PropTypes.number.isRequired,
    };
}
