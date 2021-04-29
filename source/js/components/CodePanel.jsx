import React from 'react';
import PropTypes from 'prop-types';

import { arrayInitialize, indexToAxial } from '../hexagony/util.mjs';
import { colorModes, parseBreakpoint } from '../view/viewutil.mjs';
import { calculateX, calculateY, cellOffsetY, cellWidth, getHexagonOffsets } from './GridShared.jsx';
import { GridCell } from './GridCell.jsx';
import { GridCellBreakpoint } from './GridCellBreakpoint.jsx';
import { GridEdgeConnectors } from './GridEdgeConnectors.jsx';
import { GridExecutionArrow } from './GridExecutionArrow.jsx';
import { GridOutline } from './GridOutline.jsx';

// Unimplemented:
// Cell colors for all cells but the currently active one.
// Cell colors for non-active IP.
// Execution arrows for non-active cells.
// Keyboard navigation.
// This is currently slower than the non-React GridView in terms of handling grid size changes,
// updating when characters change, and cell color animations.
// It would be possible to use a hybrid approach for cell color animations, like I'm using for arrow
// animations, and trigger those updates outside of React. However, the other use cases would still
// be slower. I'm not sure why, but the CodePanel always seems to take at least 83 msec to update
// at size 11 with edge transition mode turned on, at least in Dev mode.
// It's probably related to the number of children and probably includes the amount of time spent
// determining whether they should update. When edge transition mode is off, at size 11,
// it takes around 15 msec, instead of 83. It's possible that reducing the number of props that
// GridCell has would help.
// For handling the grid size changes, I have a feeling React will always be a bit slower, because
// the DOM just gets so large at larger grid sizes.
// In theory, everything else can be optimized outside of React: changing code, toggling breakpoints,
// all animations. But I already have that.

const padding = 35;
const executedColorCount = 10;

const gridColors = arrayInitialize(2, mode =>
    arrayInitialize(6, offset => {
        const colorMode = colorModes[mode];
        return {
            cellExecuted: arrayInitialize(6, index => `cellExecuted${(index + offset) % 6}${colorMode}`),
            cellActive: arrayInitialize(6, index => `cellActive${(index + offset) % 6}${colorMode}`),
            cellInactive: arrayInitialize(6, index => `cellInactive${(index + offset) % 6}${colorMode}`),
            arrowExecuted: arrayInitialize(6, index => `arrowExecuted${(index + offset) % 6}${colorMode}`),
            arrowActive: arrayInitialize(6, index => `arrowActive${(index + offset) % 6}${colorMode}`),
            arrowInactive: arrayInitialize(6, index => `arrowInactive${(index + offset) % 6}${colorMode}`),
            cellExecutedArray: arrayInitialize(6, i =>
                arrayInitialize(executedColorCount, j => `cellExecuted${(i + offset) % 6}_${j}${colorMode}`)),
            arrowExecutedArray: arrayInitialize(6, i =>
                arrayInitialize(executedColorCount, j => `arrowExecuted${(i + offset) % 6}_${j}${colorMode}`)),
        };
    }));

export class CodePanel extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            focusedI: null,
            focusedJ: null,
            focusedK: null,
        };
        this.edgeConnectorsRef = React.createRef();
    }

    onBlur = () =>
        this.setState({
            focusedI: null,
            focusedJ: null,
            focusedK: null,
        });

    navigateTo = (i, j, k) => {
        this.setState({
            focusedI: i,
            focusedJ: j,
            focusedK: k,
        });
    };

    onAnimationEnd = event => {
        if (event.animationName.startsWith('connector')) {
            event.target.classList.remove('connectorFlash');
            event.target.classList.remove('connectorNeutralFlash');
            event.target.classList.remove('connectorFlashSecondary');
            event.target.classList.remove('connectorNeutralFlashSecondary');
        }
    };

    playEdgeAnimation(edgeName, isBranch) {
        if (this.edgeConnectorsRef.current) {
            this.edgeConnectorsRef.current.playEdgeAnimation(edgeName, isBranch);
        }
    }

    render() {
        const { colorMode, colorOffset, breakpoints, delay, edgeTransitionMode,
            executionHistory, onEditHexagonCharacter, onToggleBreakpoint, grid, selectedIp,
            size } = this.props;

        const { focusedI, focusedJ, focusedK } = this.state;
        const rowCount = grid.length;
        let fullHeight;
        let fullWidth;

        // When showing 6 hexagons around a center hexagon,
        // the "rowCount" below represents the number of rows in the center of one of the side hexagons.
        // the "size" represents the number of rows on the top and bottom edges of the center hexagons.
        // and 1 represents the gap between them.
        if (edgeTransitionMode) {
            fullWidth = 2*(cellWidth * (rowCount * 2 + size + 1) + padding);

            // This is just enough room to show a couple rows of the hexagons above and below the center one.
            // More might be shown than this, but this is the minimum to show.
            fullHeight = 2 * (cellOffsetY * (rowCount + 6));
        }
        else {
            fullWidth = 2 * (cellWidth * rowCount + padding);
            fullHeight = 2 * (cellOffsetY * rowCount + padding);
        }

        const centerX = fullWidth / 2;
        const centerY = fullHeight / 2;
        const offsets = edgeTransitionMode ? getHexagonOffsets(size) : [[0, 0]];
        const getX = (i, j, k) => centerX + calculateX(size, offsets, i, j, k);
        const getY = (i, k) => centerY + calculateY(size, offsets, i, k);

        let activeI = -1;
        let activeJ = -1;
        let angle;
        if (executionHistory) {
            [[activeI, activeJ, angle]] = executionHistory[selectedIp];
        }

        const colors = gridColors[colorMode][colorOffset];

        const hexagons = [];
        for (let k = 0; k < offsets.length; k++) {
            const cells = [];
            for (let i = 0; i < grid.length; i++) {
                for (let j = 0; j < grid[i].length; j++) {
                    let className = '';
                    let arrows = [];
                    if (i === activeI && j === activeJ) {
                        className = colors.cellActive[selectedIp] + (k ? 'Secondary' : '');
                        if (k === 0) {
                            arrows.push(<GridExecutionArrow
                                angle={angle}
                                key={angle}
                                className={colors.arrowActive[selectedIp]}
                                delay={delay}/>);
                        }
                    }

                    // // INLINE VERSION
                    // const text = grid[i][j] || '.';
                    // const pointAxial = indexToAxial(size, i, j);
                    // const x = getX(i, j, k);
                    // const y = getY(i, k);
                    // const innerContent =
                    //     <text className={text === '.' ? 'cellText noop' : 'cellText'} textAnchor="middle" dominantBaseline="central">
                    //         {text}
                    //     </text>;
                    // cells.push(<g className="cell"
                    //     key={`path_${i}_${j}_${k}`}
                    //     onClick={() => this.navigateTo(i, j, k)}
                    //     transform={`translate(${x},${y})`}>
                    //     <path className={`cellPath ${className}`} d="M17.32 10v-20L0-20l-17.32 10v20L0 20z"
                    //         style={{ transitionDuration: delay }}/>
                    //     <title>
                    //         {`Coordinates: ${pointAxial}`}
                    //     </title>
                    //     {innerContent}
                    //     {arrows}
                    // </g>);

                    if (!arrows.length) {
                        // Prevent updates to unmodified cells.
                        arrows = null;
                    }

                    cells.push(<GridCell
                        className={className}
                        delay={delay}
                        isFocused={i === focusedI && j === focusedJ && k === focusedK}
                        key={`path_${i}_${j}_${k}`}
                        onBlur={this.onBlur}
                        onClick={this.navigateTo}
                        onEditHexagonCharacter={onEditHexagonCharacter}
                        onToggleBreakpoint={onToggleBreakpoint}
                        pointAxial={indexToAxial(size, i, j).toString()}
                        text={grid[i][j] || '.'}
                        i={i}
                        j={j}
                        k={k}
                        x={getX(i, j, k)}
                        y={getY(i, k)}>
                        {arrows}
                    </GridCell>);
                }
            }

            hexagons.push(<g key={k}>{cells}</g>);
        }

        const gridOutlines = [];
        for (let k = 0; k < offsets.length; k++) {
            gridOutlines.push(<GridOutline
                key={`outline${k}`}
                isSecondary={Boolean(k)}
                size={size}
                x={getX(0, 0, k)}
                y={getY(0, k)}/>);
        }

        const cellBreakpoints = [];
        for (const breakpoint of breakpoints) {
            const [i, j] = parseBreakpoint(breakpoint);
            for (let k = 0; k < offsets.length; k++) {
                cellBreakpoints.push(<GridCellBreakpoint
                    key={`breakpoint_${i}_${j}_${k}`}
                    x={getX(i, j, k)}
                    y={getY(i, k)}/>);
            }
        }

        const edgeConnectors = edgeTransitionMode ?
            <GridEdgeConnectors
                centerX={centerX}
                centerY={centerY}
                delay={delay}
                ref={this.edgeConnectorsRef}
                size={size}/> :
            null;

        // SVG groups are used below to control the Z-order.
        return (
            <div id="codePanel">
                <div style={{ maxWidth: fullWidth / 2, maxHeight: fullHeight / 2 }}>
                    <noscript>You need to enable JavaScript to run this app.</noscript>
                    <div style={{ transform: `matrix(1,0,0,1,${-fullWidth*0.25},${-fullHeight*0.25})` }}>
                        <svg width={fullWidth} height={fullHeight} onAnimationEnd={this.onAnimationEnd}>
                            <g>{hexagons}</g>
                            {edgeConnectors}
                            <g>{gridOutlines}</g>
                            <g>{cellBreakpoints}</g>
                        </svg>
                    </div>
                </div>
            </div>
        );
    }

    static propTypes = {
        colorMode: PropTypes.number.isRequired,
        colorOffset: PropTypes.number.isRequired,
        breakpoints: PropTypes.arrayOf(PropTypes.string).isRequired,
        delay: PropTypes.string.isRequired,
        edgeTransitionMode: PropTypes.bool.isRequired,
        executionHistory: PropTypes.arrayOf(PropTypes.array),
        grid: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.string)).isRequired,
        onEditHexagonCharacter: PropTypes.func.isRequired,
        onToggleBreakpoint: PropTypes.func.isRequired,
        size: PropTypes.number.isRequired,
        selectedIp: PropTypes.number.isRequired,
        showArrows: PropTypes.bool.isRequired,
        showIPs: PropTypes.bool.isRequired,
    };
}
