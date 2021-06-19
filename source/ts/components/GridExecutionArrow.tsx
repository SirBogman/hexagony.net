import React from 'react';

type GridExecutionArrowProps = {
    angle: number;
    className: string;
    delay: string;
}

export class GridExecutionArrow extends React.PureComponent<GridExecutionArrowProps> {
    render(): JSX.Element {
        const { angle, className, delay } = this.props;
        return <path
            className={`cellExecutedArrow ${className}`}
            d="M-12 0l-5-7.21V7.2L-12 0z"
            style={{ animationDuration: delay, transitionDuration: delay }}
            transform={`rotate(${angle})`}/>;
    }
}
