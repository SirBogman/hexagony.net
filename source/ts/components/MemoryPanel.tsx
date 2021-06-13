import React from 'react';
import panzoom, { PanZoom } from 'panzoom';
import { getMPAngle, getMPCoordinates } from './MemoryHexagonGrid';
import { Memory } from '../hexagony/Memory';
import { MemoryPointer } from '../hexagony/MemoryPointer';
import { getMPEndpoints } from './MemoryPointerView';
import { MemoryView } from './MemoryView';
import { assertNotNull } from '../view/ViewUtil';

import '../../styles/MemoryPanel.scss';

interface IMemoryPanelProps {
    delay: string;
    isPlayingAtHighSpeed: boolean;
    memory: Memory;
    mp: MemoryPointer;
}

export class MemoryPanel extends React.Component<IMemoryPanelProps> {
    viewRef: React.RefObject<MemoryView> = React.createRef();
    memoryPanZoomReference: PanZoom | null = null;

    get memoryPanZoom(): PanZoom {
        return assertNotNull(this.memoryPanZoomReference, 'memoryPanZoomReference');
    }

    componentDidMount(): void {
        this.memoryPanZoomReference = panzoom(this.getSvg(), {
            // Don't pan when clicking on text elements. This allows text selection.
            beforeMouseDown: (e: MouseEvent) => (e.target as Node).nodeName === 'text',
            beforeDoubleClick: (e: MouseEvent) => (e.target as Node).nodeName === 'text',
            zoomDoubleClickSpeed: 1.5,
            // 6.5% zoom per mouse wheel event:
            zoomSpeed: 0.065,
            // Don't listen for keyboard events.
            filterKey: () => true,
        });

        this.recenterView();
    }

    componentDidUpdate(): void {
        // Recenter the memory pointer when it leaves the visible area.
        if (this.isMPOffscreen()) {
            const [x, y] = this.getMPOffset(this.getScale());
            this.memoryPanZoom.smoothMoveTo(x, y);
        }
    }

    componentWillUnmount(): void {
        this.memoryPanZoom.dispose();
    }

    getContainerSize(): readonly [number, number] {
        const containerStyle = getComputedStyle(assertNotNull(this.getSvg().parentElement, 'svg parentElement'));
        return [parseFloat(containerStyle.width), parseFloat(containerStyle.height)];
    }

    getMPCoordinates(): readonly [number, number] {
        return getMPCoordinates(this.props.mp);
    }

    isMPOffscreen(): boolean {
        const [x, y] = this.getMPCoordinates();
        const [point1, point2] = getMPEndpoints(x, y, getMPAngle(this.props.mp));
        const [x1, y1] = this.transformToNormalizeViewCoordinates(point1);
        const [x2, y2] = this.transformToNormalizeViewCoordinates(point2);
        return x1 < 0 || x1 > 1 || y1 < 0 || y1 > 1 ||
               x2 < 0 || x2 > 1 || y2 < 0 || y2 > 1;
    }

    transformToNormalizeViewCoordinates([x, y]: readonly [number, number]): readonly [number, number] {
        const t = this.memoryPanZoom.getTransform();
        const [width, height] = this.getContainerSize();
        return [(t.scale * x + t.x) / width, (t.scale * y + t.y) / height];
    }

    // Gets the required offset to center the memory pointer in the container at the given scale.
    // This is essentially the inverse calculation of transformToNormalizeViewCoordinates.
    getMPOffset(scale = 1.0): readonly [number, number] {
        const [x, y] = this.getMPCoordinates();
        const [width, height] = this.getContainerSize();
        return [0.5 * width - scale * x, 0.5 * height - scale * y];
    }

    getScale(): number {
        return this.memoryPanZoom.getTransform().scale;
    }

    getSvg(): SVGSVGElement {
        return assertNotNull(this.viewRef.current, 'MemoryPanel.viewRef').getSvg();
    }

    render(): JSX.Element {
        const { delay, memory, mp } = this.props;
        return (
            <div id="memoryPanel">
                <h1>Memory</h1>
                <button id="resetViewButton" className="bodyButton" onClick={() => this.resetView()}
                    title="Reset the position and zoom level of the view.">
                    Reset View
                </button>
                <div id="memoryContainer">
                    <MemoryView memory={memory} mp={mp} delay={delay} ref={this.viewRef}/>
                </div>
            </div>
        );
    }

    recenterView(): void {
        const [x, y] = this.getMPOffset();
        this.memoryPanZoom.moveTo(x, y);
    }

    resetView(): void {
        const [x, y] = this.getMPOffset();
        // zoomAbs doesn't cancel movement, so the user might have to wait for the memory view to stop drifting
        // (inertia), if that method were used.
        this.memoryPanZoom.zoomTo(x, y, 1.0 / this.getScale());
        this.memoryPanZoom.moveTo(x, y);
    }

    shouldComponentUpdate(nextProps: IMemoryPanelProps): boolean {
        // It slows down the app too much to render the memory panel when executing at maximum speed.
        // Don't render until the execution stops, or the execution speed is reduced.
        return !nextProps.isPlayingAtHighSpeed;
    }
}
