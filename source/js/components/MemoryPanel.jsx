import React from 'react';
import PropTypes from 'prop-types';
import panzoom from 'panzoom';
import { getMPCoordinates } from './MemoryHexagonGrid.jsx';
import { MemoryView } from './MemoryView.jsx';

// If the memory pointer is within this normalized distance of an the edge of the container,
// then it will be recentered.
const recenteringThreshold = 0.1;
const recenteringMax = 1.0 - recenteringThreshold;

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
        const { delay, memory } = this.props;
        return (
            <div id="memoryPanel">
                <h1>Memory</h1>
                <button id="resetViewButton" className="bodyButton" onClick={() => this.resetView()}
                    title="Reset the position and zoom level of the view.">
                    Reset View
                </button>
                <div id="memoryContainer">
                    <MemoryView memory={memory} delay={delay} ref={this.viewRef}/>
                </div>
            </div>
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

    shouldComponentUpdate(nextProps) {
        // It slows down the app too much to render the memory panel when executing at maximum speed.
        // Don't render until the execution stops, or the execution speed is reduced.
        return !nextProps.isPlayingAtHighSpeed;
    }

    static propTypes = {
        delay: PropTypes.string.isRequired,
        isPlayingAtHighSpeed: PropTypes.bool.isRequired,
        memory: PropTypes.object.isRequired,
    };
}
