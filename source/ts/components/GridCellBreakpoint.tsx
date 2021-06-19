import React from 'react';

type GridCellBreakpointProps = {
    x: number;
    y: number;
}

export class GridCellBreakpoint extends React.PureComponent<GridCellBreakpointProps> {
    render(): JSX.Element {
        const { x, y } = this.props;
        return <path
            className="cellBreakpoint"
            d="M17.32 10v-20L0-20l-17.32 10v20L0 20z"
            transform={`translate(${x},${y})`}/>;
    }
}
