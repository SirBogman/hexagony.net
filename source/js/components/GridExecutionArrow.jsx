import React from 'react';
import PropTypes from 'prop-types';

export class GridExecutionArrow extends React.PureComponent {
    render() {
        const { angle, className, delay } = this.props;
        return <path
            className={`cellExecutedArrow ${className}`}
            d="M-12 0l-5-7.21V7.2L-12 0z"
            style={{ animationDuration: delay, transitionDuration: delay }}
            transform={`rotate(${angle})`}/>;
    }

    static propTypes = {
        className: PropTypes.string.isRequired,
        angle: PropTypes.number.isRequired,
        delay: PropTypes.string.isRequired,
    };
}
