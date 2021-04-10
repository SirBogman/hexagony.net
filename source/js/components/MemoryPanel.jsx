import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { northEast, southEast } from '../hexagony/direction.mjs';
import panzoom from 'panzoom';

// If the memory pointer is within this normalized distance of an the edge of the container,
// then it will be recentered.
const recenteringThreshold = 0.1;
const recenteringMax = 1.0 - recenteringThreshold;

const edgeLength = 46.24;
const cellHeight = 2 * edgeLength;
const cellOffsetY = 3 / 4 * cellHeight;
const cellOffsetX = Math.sqrt(3) / 2 * edgeLength;

const xFactor = 0.5 * cellOffsetX;
const yFactor = 0.5 * cellOffsetY;

function getMPCoordinates(memory) {
    return [memory.getX() * xFactor, memory.getY() * yFactor];
}

export class MemoryPointer extends React.PureComponent {
    render() {
        const {x, y, angle, delay} = this.props;
        // The transform must be set through the style for it to animate automatically.
        // Sometimes the pointer spins around extra times when animating.
        // In some cases, this can be avoided by chosing different angles with the same remainder mod 360.
        // I tried to avoid the issue by setting the transform as a matrix, but it didn't seem to make a difference.
        return <path id="memoryPointer"
            d="M0-23.12l-3 46.24h6z"
            style={{
                transform: `translate(${x.toFixed(2)}px,${y.toFixed(2)}px)rotate(${angle % 360}deg)`,
                transitionDuration: delay,
            }}
        />;
    }
}

MemoryPointer.propTypes = {
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    angle: PropTypes.number.isRequired,
    delay: PropTypes.string.isRequired,
};

export class MemoryCell extends React.PureComponent {
    render() {
        const key= `${this.props.x},${this.props.y}`;
        const transform = `translate(${(this.props.x * xFactor).toFixed(2)},${(this.props.y * yFactor).toFixed(2)})rotate(${this.props.angle})`;

        if (this.props.value === undefined) {
            return <path key={key} className="memoryCell" d="M-23.12 0h46.24" transform={transform}/>;
        }
        else {
            const string = this.props.value.toString();
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
                    <path className="memoryCell memoryValue" d="M-23.12 0h46.24"/>
                    <text fontSize="12px" transform="translate(0 14)" textAnchor="middle">{text}</text>
                    <title>{fullString}</title>
                </g>
            );
        }
    }
}

MemoryCell.propTypes = {
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    angle: PropTypes.number.isRequired,
    // value should be a BigInt but that doesn't seem to be supported.
    value: PropTypes.any,
};

export class MemoryHexagonGrid extends React.PureComponent {
    render() {
        const {x, y, rows, columns} = this.props;
        let path = '';
        const startX = (2 * x - 1.5 + y % 2) * cellOffsetX;
        const startY = (y + 0.5) * cellOffsetY - 0.5 * edgeLength;
        const nwEdge = `l${cellOffsetX.toFixed(2)} ${(-0.5 * edgeLength).toFixed(2)}`;
        const neEdge = `l${cellOffsetX.toFixed(2)} ${(0.5 * edgeLength).toFixed(2)}`;

        for (let i = 0; i < rows + 1; i++) {
            const rowY = startY + cellOffsetY * i;

            // NW and NE edges
            const isLastEvenRow = i === rows && i % 2 === 0;
            const isLastOddRow = i === rows && i % 2 !== 0;
            path += `M${(startX + (isLastEvenRow ? cellOffsetX : 0)).toFixed(2)} ${(rowY - (i % 2 + isLastEvenRow) * 0.5 * edgeLength).toFixed(2)}`;
            if (i % 2) {
                path += neEdge;
            }
            for (let j = 0; j < columns; j++) {
                // Don't draw an extra line segment in the bottom left, if there's an even number of rows.
                if (j || !isLastEvenRow) {
                    path += nwEdge;
                }

                // Don't draw an extra line segment in the bottom right, if there's an odd number of rows.
                if (j < columns - 1 || !isLastOddRow) {
                    path += neEdge;
                }
            }

            if (i !== 0 && i % 2 === 0) {
                path += nwEdge;
            }

            // Vertical lines
            if (i < rows) {
                for (let j = 0; j < columns + 1; j++) {
                    path += `M${(startX + cellOffsetX * (i % 2) + j * cellOffsetX * 2).toFixed(2)} ${rowY.toFixed(2)}v${edgeLength.toFixed(2)}`;
                }
            }
        }

        return <path className="memoryCell" d={path}/>;
    }
}

MemoryHexagonGrid.propTypes = {
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    rows: PropTypes.number.isRequired,
    columns: PropTypes.number.isRequired,
};

// Displays the values that are set in memory.
export class MemoryCells extends React.Component {
    constructor(props) {
        super(props);
        this.lastDataVersion = -1;
    }

    render() {
        const { memory } = this.props;
        this.lastDataVersion = memory.dataVersion;
        const cells = memory.getDataArray().map(entry => {
            const {x, y, dir, value} = entry;
            const angle = dir === northEast ? 30 : dir === southEast ? -30 : -90;
            return <MemoryCell key={`${x},${y}`} x={x} y={y} angle={angle} value={value}/>;
        });

        return <g>{cells}</g>;
    }

    shouldComponentUpdate(nextProps) {
        return nextProps.memory.dataVersion !== this.lastDataVersion;
    }
}

MemoryCells.propTypes = {
    memory: PropTypes.object.isRequired,
};

export class MemoryView extends React.Component {
    constructor(props) {
        super(props);
        this.viewRef = React.createRef();
    }

    getSvg() {
        return this.viewRef.current;
    }

    render() {
        const {delay, memory} = this.props;
        if (!memory) {
            return <svg ref={this.viewRef}/>;
        }

        const [x, y] = getMPCoordinates(memory);
        const angle = memory.dir.angle + (memory.cw ? 180 : 0);

        return (
            <svg overflow="visible" ref={this.viewRef}>
                <MemoryCells memory={memory}/>
                <MemoryPointer x={x} y={y} angle={angle} delay={delay}/>
                {this.renderHexagonGrid()}
            </svg>
        );
    }

    renderHexagonGrid() {
        const memory = this.props.memory;
        const currentX = memory.getX();
        const currentY = memory.getY();
        const haveBounds = memory.minX !== undefined;
        const minX = haveBounds ? Math.min(memory.minX, currentX) : currentX;
        const minY = haveBounds ? Math.min(memory.minY, currentY) : currentY;
        const maxX = haveBounds ? Math.max(memory.maxX, currentX) : currentX;
        const maxY = haveBounds ? Math.max(memory.maxY, currentY) : currentY;

        // Coordinates for the center hexagon:
        // E edge: 1, 1
        // NE edge: 0, 0
        // NW edge: -2, 0
        // W edge: -3, 1
        // SW edge: -2, -2
        // SE edge: 0, 2
        // Figure out how many hexagons are needed based on these coordinates.
        const x1 = roundGridValueLowerBound(Math.floor((minX + 3) / 4));
        const x2 = roundGridValueUpperBound(Math.floor((maxX + 3) / 4));
        const y1 = roundGridValueLowerBound(Math.floor((minY - 1) / 2));
        const y2 = roundGridValueUpperBound(Math.floor((maxY - 1) / 2));

        // Render the background as a single path. If rendered as more than one path, you can sometimes see seams between the parts.
        return <MemoryHexagonGrid x={x1} y={y1} columns={x2 - x1 + 1} rows={y2 - y1 + 1}/>;
    }
}

function roundGridValueLowerBound(value) {
    // Testing: [...Array(30)].fill(null).map((x,i) => i).map(x => roundGridValueUpperBound(x) - x);
    // The difference between x and (Math.ceil(value / 5) - 3) * 5 and x is between 11 and 15.
    return (Math.ceil(value / 5) - 3) * 5;
}

function roundGridValueUpperBound(value) {
    // Testing: [...Array(30)].fill(null).map((x,i) => i).map(x => (Math.floor(x / 5) + 3) * 5 - x);
    // The difference between (Math.floor(value / 5) + 3) * 5 and x is between 11 and 15.
    return (Math.floor(value / 5) + 3) * 5;
}

MemoryView.propTypes = {
    memory: PropTypes.object,
    delay: PropTypes.string.isRequired,
};

export class MemoryPanel extends React.Component {
    constructor(props) {
        super(props);
        this.viewRef = React.createRef();
    }

    componentDidMount() {
        this.memoryPanZoom = panzoom(this.getSvg(), {
            // Don't pan when clicking on text elements. This allows text selection.
            beforeMouseDown: e => e.target.nodeName === 'text',
            beforeDoubleClick: e => e.target.nodeName === 'text',
            zoomDoubleClickSpeed: 1.5,
            // 6.5% zoom per mouse wheel event:
            zoomSpeed: 0.065,
            // Don't listen for keyboard events.
            filterKey: () => true,
        });

        if (this.props.memory) {
            this.recenterView();
        }
    }

    componentDidUpdate(prevProps) {
        if (!this.props.memory) {
            return;
        }

        if (this.props.memory !== prevProps.memory) {
            this.recenterView();
        }
        else {
            const [a, b] = this.getNormalizedMPCoordinates();
            // Recenter the memory pointer when it gets too close to the edges.
            if (a < recenteringThreshold || a > recenteringMax || b < recenteringThreshold || b > recenteringMax) {
                const [x, y] = this.getMPOffset(this.getScale());
                this.memoryPanZoom.smoothMoveTo(x, y);
            }
        }
    }

    componentWillUnmount() {
        this.memoryPanZoom.dispose();
    }

    getContainerSize() {
        const containerStyle = getComputedStyle(this.getSvg().parentNode);
        return [parseFloat(containerStyle.width), parseFloat(containerStyle.height)];
    }

    getMPCoordinates() {
        return getMPCoordinates(this.props.memory);
    }

    getNormalizedMPCoordinates() {
        const [x, y] = this.getMPCoordinates();
        const t = this.memoryPanZoom.getTransform();
        const [width, height] = this.getContainerSize();
        return [(t.scale * x + t.x) / width, (t.scale * y + t.y) / height];
    }

    // Gets the required offset to center the memory pointer in the container at the given scale.
    // This is essentially the inverse calculation of getNormalizedMPCoordinates.
    getMPOffset(scale = 1.0) {
        const [x, y] = this.getMPCoordinates();
        const [width, height] = this.getContainerSize();
        return [0.5 * width - scale * x, 0.5 * height - scale * y];
    }

    getScale() {
        return this.memoryPanZoom.getTransform().scale;
    }

    getSvg() {
        return this.viewRef.current.getSvg();
    }

    render() {
        const {delay, memory} = this.props;
        return (
            <>
                <h1>Memory</h1>
                <div>
                    <button id="resetViewButton" onClick={() => this.resetView()} title="Reset the position and zoom level of the view.">
                        Reset View
                    </button>
                    Click and drag to pan. Zooming is also supported.
                </div>
                <div id="memoryContainer">
                    <MemoryView memory={memory} delay={delay} ref={this.viewRef}/>
                </div>
            </>
        );
    }

    recenterView() {
        const [x, y] = this.getMPOffset();
        this.memoryPanZoom.moveTo(x, y);
    }

    resetView() {
        const [x, y] = this.getMPOffset();
        // zoomAbs doesn't cancel movement, so the user might have to wait for the memory view to stop drifting (inertia).
        // if that method were used.
        this.memoryPanZoom.zoomTo(x, y, 1.0 / this.getScale());
        this.memoryPanZoom.moveTo(x, y);
    }
}

MemoryPanel.propTypes = {
    memory: PropTypes.object,
    delay: PropTypes.string.isRequired,
};

export function updateMemoryPanel(element, memory, delay) {
    ReactDOM.render(<React.StrictMode><MemoryPanel memory={memory} delay={delay}/></React.StrictMode>, element);
}
