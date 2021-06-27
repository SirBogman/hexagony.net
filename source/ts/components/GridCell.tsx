import React from 'react';

type GridCellProps = {
    className: string,
    text: React.ReactNode;
    x: number;
    y: number;
};

export const GridCell: React.FC<GridCellProps> = ({
    children,
    className,
    text,
    x,
    y,
}) =>
    <g className="cell" transform={`translate(${x},${y})`}>
        <path className={`cellPath ${className}`} d="M17.32 10v-20L0-20l-17.32 10v20L0 20z"/>
        <text className={text === '.' ? 'cellText noop' : 'cellText'}
            textAnchor="middle" dominantBaseline="central">
            {text}
        </text>
        {children}
    </g>;
