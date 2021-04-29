import React from 'react';
import PropTypes from 'prop-types';

export class GridCellBreakpoint extends React.PureComponent {
    render() {
        const { x, y } = this.props;
        return <path
            className="cellBreakpoint"
            d="M17.32 10v-20L0-20l-17.32 10v20L0 20z"
            transform={`translate(${x},${y})`}/>;
    }

    static propTypes = {
        x: PropTypes.number.isRequired,
        y: PropTypes.number.isRequired,
    };
}
