import React from 'react';
import panzoom, { PanZoom } from 'panzoom';
import { getMPAngle, getMPCoordinates } from './MemoryHexagonGrid';
import { Memory } from '../hexagony/Memory';
import { MemoryPointer } from '../hexagony/MemoryPointer';
import { getMPEndpoints } from './MemoryPointerView';
import { MemoryView } from './MemoryView';
import { approximatelyEqual, assertNotNull } from '../view/ViewUtil';

import '../../styles/MemoryPanel.scss';

interface IMemoryPanelProps {
    delay: string;
    isPlayingAtHighSpeed: boolean;
    memory: Memory;
    mp: MemoryPointer;
}

type MemoryPanelState = {
    canResetView: boolean;
};

export class MemoryPanel extends React.Component<IMemoryPanelProps, MemoryPanelState> {
    private viewRef: React.RefObject<MemoryView> = React.createRef();
    private panZoomReference: PanZoom | null = null;

    public constructor(props: IMemoryPanelProps) {
        super(props);
        this.state = { canResetView: false };
    }

    private get panZoom(): PanZoom {
        return assertNotNull(this.panZoomReference, 'panZoomReference');
    }

    componentDidMount(): void {
        this.panZoomReference = panzoom(this.getSvg(), {
            minimumDistance: 10,
            // Don't pan when clicking on text elements. This allows text selection.
            beforeMouseDown: (e: MouseEvent) => (e.target as Node).nodeName === 'text',
            beforeDoubleClick: (e: MouseEvent) => (e.target as Node).nodeName === 'text',
            zoomDoubleClickSpeed: 1.5,
            // 6.5% zoom per mouse wheel event:
            zoomSpeed: 0.065,
        });

        // The user may pan with the arrow keys. Use pan, instead of panend.
        this.panZoom.on('pan', this.updateCanResetView);
        this.panZoom.on('zoom', this.updateCanResetView);
        this.panZoom.on('zoomend', this.updateCanResetView);

        this.recenterView();
    }

    componentDidUpdate(): void {
        // Recenter the memory pointer when it leaves the visible area.
        if (this.isMPOffscreen()) {
            const [x, y] = this.getMPOffset(this.getScale());
            this.panZoom.smoothMoveTo(x, y);
        }
    }

    componentWillUnmount(): void {
        this.panZoom.dispose();
    }

    private getContainerSize(): readonly [number, number] {
        const containerStyle = getComputedStyle(assertNotNull(this.getSvg().parentElement, 'svg parentElement'));
        return [parseFloat(containerStyle.width), parseFloat(containerStyle.height)];
    }

    private getMPCoordinates(): readonly [number, number] {
        return getMPCoordinates(this.props.mp);
    }

    private isMPOffscreen(): boolean {
        const [x, y] = this.getMPCoordinates();
        const [point1, point2] = getMPEndpoints(x, y, getMPAngle(this.props.mp));
        const [x1, y1] = this.transformToNormalizeViewCoordinates(point1);
        const [x2, y2] = this.transformToNormalizeViewCoordinates(point2);
        return x1 < 0 || x1 > 1 || y1 < 0 || y1 > 1 ||
               x2 < 0 || x2 > 1 || y2 < 0 || y2 > 1;
    }

    private transformToNormalizeViewCoordinates([x, y]: readonly [number, number]): readonly [number, number] {
        const t = this.panZoom.getTransform();
        const [width, height] = this.getContainerSize();
        return [(t.scale * x + t.x) / width, (t.scale * y + t.y) / height];
    }

    // Gets the required offset to center the memory pointer in the container at the given scale.
    // This is essentially the inverse calculation of transformToNormalizeViewCoordinates.
    private getMPOffset(scale = 1.0): readonly [number, number] {
        const [x, y] = this.getMPCoordinates();
        const [width, height] = this.getContainerSize();
        return [0.5 * width - scale * x, 0.5 * height - scale * y];
    }

    private getScale(): number {
        return this.panZoom.getTransform().scale;
    }

    private getSvg(): SVGSVGElement {
        return assertNotNull(this.viewRef.current, 'MemoryPanel.viewRef').getSvg();
    }

    private canResetView(): boolean {
        if (this.panZoomReference === null) {
            return false;
        }
        const { x, y, scale } = this.panZoom.getTransform();
        const [centerX, centerY] = this.getMPOffset();
        return !approximatelyEqual(x, centerX) || !approximatelyEqual(y, centerY) || !approximatelyEqual(scale, 1);
    }

    private readonly updateCanResetView = (): void =>
        this.setState({ canResetView: this.canResetView() });

    render(): JSX.Element {
        const { delay, memory, mp } = this.props;
        return (
            <div id="memoryPanel" className="appPanel">
                <div id="memoryPanelHeader">
                    <h1>Memory</h1>
                    <button id="resetViewButton"
                        className="bodyButton"
                        disabled={!this.canResetView()}
                        onClick={this.resetView}
                        title="Reset the position and zoom level of the memory panel.">
                        Reset View
                    </button>
                </div>
                <div id="memoryContainer">
                    <MemoryView memory={memory} mp={mp} delay={delay} ref={this.viewRef}/>
                </div>
            </div>
        );
    }

    private recenterView(): void {
        const [x, y] = this.getMPOffset();
        this.panZoom.moveTo(x, y);
    }

    private resetView = (): void => {
        const [x, y] = this.getMPOffset();
        // zoomAbs doesn't cancel movement, so the user might have to wait for the memory view to stop drifting
        // (inertia), if that method were used.
        this.panZoom.zoomTo(x, y, 1.0 / this.getScale());
        this.panZoom.moveTo(x, y);
    }

    shouldComponentUpdate(nextProps: IMemoryPanelProps): boolean {
        // It slows down the app too much to render the memory panel when executing at maximum speed.
        // Don't render until the execution stops, or the execution speed is reduced.
        return !nextProps.isPlayingAtHighSpeed;
    }
}
