import React from 'react';
import PropTypes from 'prop-types';
import { northEast, southEast } from '../hexagony/direction.mjs';
import { MemoryCell } from './MemoryCell.jsx';

// Displays the values that are set in memory.
export class MemoryCells extends React.Component {
    constructor(props) {
        super(props);
        this.lastDataVersion = -1;
    }

    render() {
        const { memory } = this.props;
        this.lastDataVersion = memory.dataVersion;
        const cells = memory.getDataArray().map(entry => {
            const { x, y, dir, value } = entry;
            const angle = dir === northEast ? 30 : dir === southEast ? -30 : -90;
            return <MemoryCell key={`${x},${y}`} x={x} y={y} angle={angle} value={value}/>;
        });

        return <g>{cells}</g>;
    }

    shouldComponentUpdate(nextProps) {
        return nextProps.memory.dataVersion !== this.lastDataVersion;
    }

    static propTypes = {
        memory: PropTypes.object.isRequired,
    };
}
