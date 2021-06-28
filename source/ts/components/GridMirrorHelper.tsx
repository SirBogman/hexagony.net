import React from 'react';
import memoizeOne from 'memoize-one';

import { HexagonyContext } from '../hexagony/HexagonyContext';
import { HexagonyStateUtils } from '../hexagony/HexagonyState';
import { PointAxial } from '../hexagony/PointAxial';
import { SourceCode } from '../hexagony/SourceCode';
import { arrayInitialize, axialToIndex, getRowCount, getRowSize, getSizeFromRowCount } from '../hexagony/Util';

import { calculateX, calculateY, cellHeight, cellOffsetY, cellWidth, singleHexagonOffsets } from '../view/GridView';

import { GridCell } from './GridCell';
import { GridOutline } from './GridOutline';
import { GridExecutionArrow } from './GridExecutionArrow';

import '../../styles/GridView.scss';

type GridMirrorHelperProps = {
    cellInfo: readonly (readonly CellInfo[])[];
}

export type CellInfo = {
    className: string;
    content: React.ReactNode;
    text: string;
    arrow: React.ReactNode;
};

const createCellInfo = (size: number): readonly (readonly CellInfo[])[] =>
    arrayInitialize(getRowCount(size), i => arrayInitialize(getRowSize(size, i), () => ({
        className: '',
        content: null,
        text: '',
        arrow: null,
    })));

export const singleMirrorHelper = memoizeOne((size: number, instruction: string, colorMode: string) => {
    const rowCount = getRowCount(size);

    const context = new HexagonyContext(SourceCode.fromObject({
        size,
        grid: arrayInitialize(rowCount, i => arrayInitialize(getRowSize(size, i), () => instruction)),
        prefixGrid: arrayInitialize(rowCount, i => arrayInitialize(getRowSize(size, i), () => '')),
    }));

    const cellInfo = createCellInfo(size);
    const getCellInfo = (point: PointAxial): CellInfo => {
        const [i, j] = axialToIndex(size, point);
        return cellInfo[i][j];
    };

    for (let { coords, dir } of HexagonyStateUtils.fromSize(size).ips) {
        // Start at corner. Rotate towards center.
        dir = dir.rotateClockwise;
        const info0 = getCellInfo(coords);
        info0.className = `cellExecuted0_1${colorMode}`;
        info0.arrow =
            <GridExecutionArrow
                angle={dir.angle}
                className={`arrowExecuted0_1${colorMode}`}
                delay="0"/>;

        // Move towards center.
        coords = coords.add(dir.vector);
        const info = getCellInfo(coords);
        info.text = instruction;
        info.className = `cellExecuted0_0${colorMode}`;
        info.arrow =
            <GridExecutionArrow
                angle={dir.angle}
                className={`arrowExecuted0_0${colorMode}`}
                delay="0"/>;

        // Simulate to determine next position/direction.
        let state1 = HexagonyStateUtils.fromContext(context);
        state1 = HexagonyStateUtils.setIpLocation(state1, coords, dir);
        const state2 = HexagonyStateUtils.step(state1, context);
        const ip = HexagonyStateUtils.activeIpState(state2);
        const info2 = getCellInfo(ip.coords);
        info2.className = `cellActive0${colorMode}`;
        info2.arrow =
            <GridExecutionArrow
                angle={ip.dir.angle}
                // className="typingDirectionArrow"
                className={`arrowActive0${colorMode}`}
                delay="0"/>;

        const state1b = HexagonyStateUtils.setMemoryValue(state1, 1);
        const state2b = HexagonyStateUtils.step(state1b, context);
        const ip2 = HexagonyStateUtils.activeIpState(state2b);
        if (!ip2.coords.equals(ip.coords)) {
            const [i3, j3] = axialToIndex(size, ip2.coords);
            const info3 = cellInfo[i3][j3];
            info3.className = `cellActive0${colorMode}`;
            info3.arrow =
                <GridExecutionArrow
                    angle={ip2.dir.angle}
                    // className="typingDirectionArrow"
                    className={`arrowActive0${colorMode}`}
                    delay="0"/>;

            info2.text = '-';
            info3.text = '+';
        }
    }

    return cellInfo;
});

export const multipleMirrorHelper = memoizeOne((size: number, colorMode: string) => {
    const rowCount = getRowCount(size);

    const sourceCode = SourceCode.fromObject({
        size,
        grid: arrayInitialize(rowCount, i => arrayInitialize(getRowSize(size, i), () => '.')),
        prefixGrid: arrayInitialize(rowCount, i => arrayInitialize(getRowSize(size, i), () => '')),
    });

    const cellInfo = createCellInfo(size);
    const getCellInfo = (point: PointAxial): CellInfo => {
        const [i, j] = axialToIndex(size, point);
        return cellInfo[i][j];
    };

    for (let { coords, dir } of HexagonyStateUtils.fromSize(size).ips) {
        // Move one step towards center.
        dir = dir.rotateClockwise;
        coords = coords.add(dir.vector);
        const info = getCellInfo(coords);
        info.className = `cellInactive0${colorMode}`;
        info.arrow =
            <GridExecutionArrow
                angle={dir.angle}
                // className="typingDirectionArrow"
                className={`arrowActive0${colorMode}`}
                delay="0"/>;

        // Note that '|' is deliberately between '<' and '>' so that left and right corners show '|>' and '<|'.
        for (const instruction of ['<', '|', '>', '/', '\\', '_']) {
            const [i, j] = axialToIndex(size, coords);

            sourceCode.grid[i][j] = instruction;
            const context = new HexagonyContext(sourceCode);

            // Simulate to determine next position/direction when memory edge value is zero.
            let state1 = HexagonyStateUtils.fromContext(context);
            state1 = HexagonyStateUtils.setIpLocation(state1, coords, dir);
            const state2 = HexagonyStateUtils.step(state1, context);
            const point1 = HexagonyStateUtils.activeIpState(state2).coords;
            const info1 = getCellInfo(point1);
            info1.text += instruction;

            // Determine next position when memory edge value is positive.
            const state1b = HexagonyStateUtils.setMemoryValue(state1, 1);
            const state2b = HexagonyStateUtils.step(state1b, context);
            const point2 = HexagonyStateUtils.activeIpState(state2b).coords;
            if (!point2.equals(point1)) {
                const info2 = getCellInfo(point2);

                if (instruction === '<') {
                    info1.content = <>&lt;<tspan className="subscriptSuperscript" dy={-5}>-</tspan></>;
                    info2.content = <>&lt;<tspan className="subscriptSuperscript" dy={5}>+</tspan></>;
                }
                else {
                    info1.content =
                        <><tspan className="subscriptSuperscript" dy={5}>-</tspan><tspan dy={-5}>&gt;</tspan></>;
                    info2.content =
                        <><tspan className="subscriptSuperscript" dy={-5}>+</tspan><tspan dy={5}>&gt;</tspan></>;
                }
            }
        }
    }

    return cellInfo;
});

export const GridMirrorHelper : React.FC<GridMirrorHelperProps> = ({
    cellInfo,
}) => {
    const rowCount = cellInfo.length;
    const size = getSizeFromRowCount(rowCount);
    const padding = 32;
    const width = cellWidth * rowCount + padding;
    const height = cellOffsetY * rowCount + cellHeight - cellOffsetY + padding;
    const centerX = width / 2;
    const centerY = height / 2;
    const offsets = singleHexagonOffsets;
    const getX = (i: number, j: number) => centerX + calculateX(size, offsets, i, j, 0);
    const getY = (i: number) => centerY + calculateY(size, offsets, i, 0);

    const cells: JSX.Element[] = [];
    for (let i = 0; i < getRowCount(size); i++) {
        for (let j = 0; j < getRowSize(size, i); j++) {
            const { arrow, className, content, text } = cellInfo[i][j];
            cells.push(<GridCell
                key={`${i}_${j}`}
                className={className}
                text={content ?? text}
                x={getX(i, j)}
                y={getY(i)}>
                {arrow}
            </GridCell>);
        }
    }

    return (
        <svg width={width} height={height}>
            <rect width={width} height={height} className="svgBackground"/>
            {cells}
            <GridOutline
                key="outline"
                size={size}
                isSecondary={false}
                x={getX(0, 0)}
                y={getY(0)}/>
        </svg>
    );
};
