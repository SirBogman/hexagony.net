import React from 'react';
import { edgeLength } from './MemoryHexagonGrid';

const path = `M${-edgeLength / 2} 0h${edgeLength}`;

type MemoryEdgeProps = {
    x: number;
    y: number;
    angle: number;
    value: bigint;
};

/**
 * Displays the value of a single edge in the memory grid.
 * @component
 */
export class MemoryEdge extends React.PureComponent<MemoryEdgeProps> {
    override render(): JSX.Element {
        const { angle, x, y } = this.props;
        const transform = `translate(${x.toFixed(2)},${y.toFixed(2)})rotate(${angle})`;

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
            <g transform={transform}>
                <path className="memoryValue" d={path}/>
                <text fill="currentColor" fontSize="12px" transform="translate(0 14)" textAnchor="middle">{text}</text>
                <title>{fullString}</title>
            </g>
        );
    }
}

type MemoryEdgeLargeTextProps = {
    x: number;
    y: number;
    text: string;
};

export class MemoryEdgeLargeText extends React.PureComponent<MemoryEdgeLargeTextProps> {
    override render(): JSX.Element {
        const { text, x, y } = this.props;
        const transform = `translate(${x.toFixed(2)},${y.toFixed(2)})`;

        return (
            <g transform={transform}>
                <text fill="currentColor" fontSize="20px" transform="translate(0 30)" textAnchor="middle">{text}</text>
            </g>
        );
    }
}
