import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { east, northEast, southEast } from './hexagony/direction.mjs';
import { PointAxial } from './hexagony/pointaxial.mjs';
import panzoom from 'panzoom';

// If the memory pointer is within this normalized distance of an the edge of the container,
// then it will be recentered.
const recenteringThreshold = 0.1;
const recenteringMax = 1.0 - recenteringThreshold;

const edgeLength = 46.24;
const cellHeight = 2 * edgeLength;
const cellOffsetY = 3 / 4 * cellHeight;
const cellOffsetX = Math.sqrt(3) / 2 * edgeLength;
const cellWidth = 2 * cellOffsetX;

const xFactor = 0.5 * cellOffsetX;
const yFactor = 0.5 * cellOffsetY;

//const xFactor = 20;
//const yFactor = 34;

const xPadding = 40;
const yPadding = 40;
// const xPadding = 46;
// const yPadding = 7;

function getMPCoordinates(memory) {
    return [memory.getX() * xFactor, memory.getY() * yFactor];
}

export class MemoryPointer extends React.PureComponent {
    render() {
        return <path id="memory_pointer"
            d="M0-23.12l-3 46.24h6z"
            style={{
                transform: `translate(${this.props.x.toFixed(2)}px,${this.props.y.toFixed(2)}px)rotate(${this.props.angle % 360}deg)`,
                transitionDuration: this.props.delay,
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
            return <path key={key} className="memory_cell" d="M-23.12 0h46.24" transform={transform}/>;
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
                    <path className="memory_cell memory_value" d="M-23.12 0h46.24"/>
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
        const startX = (2 * x - 1.5) * cellOffsetX;
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

        return <path className="memory_cell" d={path}/>;
    }
}

MemoryHexagonGrid.propTypes = {
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    rows: PropTypes.number.isRequired,
    columns: PropTypes.number.isRequired,
};

export class MemoryGrid extends React.Component {
    constructor(props) {
        super(props);
        this.lastDataVersion = -1;
    }

    render() {
        const cells = [];
        const memory = this.props.memory;
        const currentX = memory.getX();
        const currentY = memory.getY();
        const minX = Math.min(memory.minX, currentX) - xPadding;
        const minY = Math.min(memory.minY, currentY) - yPadding;
        const maxX = Math.max(memory.maxX, currentX) + xPadding;
        const maxY = Math.max(memory.maxY, currentY) + yPadding;
        this.lastDataVersion = memory.dataVersion;

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                if (!(y % 2 === 0 && x % 2 === 0 ||
                    (y % 4 + 4) % 4 === 1 && (x % 4 + 4) % 4 === 1 ||
                    (y % 4 + 4) % 4 === 3 && (x % 4 + 4) % 4 === 3)) {
                    continue;
                }

                let dir, mp;

                if (y % 2 !== 0) {
                    dir = east;
                    mp = new PointAxial((x - y) / 4, (y - 1) / 2);
                }
                else if ((x - y) % 4 === 0) {
                    dir = northEast;
                    mp = new PointAxial((x - y) / 4, y / 2);
                }
                else {
                    dir = southEast;
                    mp = new PointAxial((x - y + 2) / 4, (y - 2) / 2);
                }

                const angle = dir === northEast ? 30 : dir === southEast ? -30 : -90;
                const value = memory.tryGetValueAt(mp, dir);
                cells.push(<MemoryCell key={`${x},${y}`} x={x} y={y} angle={angle} value={value}/>);
            }
        }

        console.log(`CELLS LENGTH: ${cells.length}`);
        return <g>{cells}</g>;
    }

    shouldComponentUpdate(nextProps) {
        // TODO: the background grid will also need to be updated when the memory pointer moves too far away.
        // This component will probably be converted to directly enumerate memory values that are set and make
        // components for them on top of the background grid.
        // The background grid component will probably be separate.
        return nextProps.memory.dataVersion !== this.lastDataVersion;
    }
}

MemoryGrid.propTypes = {
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
        if (!this.props.memory) {
            return <svg ref={this.viewRef}/>;
        }

        const {delay, memory} = this.props;
        const [x, y] = getMPCoordinates(memory);
        const angle = memory.dir.angle + (memory.cw ? 180 : 0);
        return (
            <svg overflow="visible" ref={this.viewRef}>
                <MemoryGrid memory={memory}/>
                <MemoryPointer x={x} y={y} angle={angle} delay={delay}/>
                {/* <MemoryHexagonGrid x={-16} y={-16} rows={32} columns={32}/> */}
            </svg>
        );
    }
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
        // TODO: the component could hide its panel when it is not running.
        // That would be easier if all of the panels were components.
        const {delay, memory} = this.props;
        return (
            <>
                <h1>Memory</h1>
                <div>
                    <button id="reset_view" onClick={() => this.resetView()} title="Reset the position and zoom level of the view.">
                        Reset View
                    </button>
                    Click and drag to pan. Zooming is also supported.
                </div>
                <div id="memory_container">
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
