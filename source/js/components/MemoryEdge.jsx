import React from 'react';
import PropTypes from 'prop-types';
import { edgeLength, xFactor, yFactor } from './MemoryHexagonGrid.jsx';

const path = `M${-edgeLength / 2} 0h${edgeLength}`;

/**
 * Displays the value of a single edge in the memory grid.
 * @component
 */
export class MemoryEdge extends React.PureComponent {
    render() {
        const key= `${this.props.x},${this.props.y}`;
        const transform = `translate(${(this.props.x * xFactor).toFixed(2)},${(this.props.y * yFactor).toFixed(2)})rotate(${this.props.angle})`;

        const string = this.props.value.toLocaleString('en');
        let extraString = '';

        const charCode = Number(this.props.value % 256n);

        if (charCode >= 0x20 && charCode <= 0xff && charCode !== 0x7f) {
            extraString += ` '${String.fromCharCode(charCode)}'`;
        }
        else if (charCode === 10) {
            extraString += " '\\n'";
        }

        const fullString = extraString ? `${string} ${extraString}` : string;
        const text = fullString.length > 8 ?
            string.length > 8 ?
                fullString.slice(0, 5) + '…' :
                string :
            fullString;

        return (
            <g key={key} transform={transform}>
                <path className="memoryCell memoryValue" d={path}/>
                <text fill="currentColor" fontSize="12px" transform="translate(0 14)" textAnchor="middle">{text}</text>
                <title>{fullString}</title>
            </g>
        );
    }

    static propTypes = {
        x: PropTypes.number.isRequired,
        y: PropTypes.number.isRequired,
        angle: PropTypes.number.isRequired,
        // value should be a BigInt but that doesn't seem to be supported.
        value: PropTypes.any.isRequired,
    };
}
