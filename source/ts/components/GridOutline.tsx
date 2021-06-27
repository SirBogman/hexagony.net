import React from 'react';
import classNames from 'classnames';

import { getOutlinePath } from '../view/GridView';

type GridOutlineProps = {
    isSecondary: boolean;
    size: number;
    x: number;
    y: number;
}

export class GridOutline extends React.PureComponent<GridOutlineProps> {
    override render(): JSX.Element {
        const { isSecondary, size, x, y } = this.props;
        return <path
            className={classNames('outline', { outlineSecondary: isSecondary })}
            d={getOutlinePath(size)}
            transform={`translate(${x},${y})`}/>;
    }
}
