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

function ignoreElement(element: Element): boolean {
    return element instanceof SVGTextElement;
}

function filterMouseEvent(event: MouseEvent): boolean | undefined {
    if (event.defaultPrevented || event.target instanceof Element && ignoreElement(event.target)) {
        // Allow clicking/double clicking on text and in the header. Enables text selection.
        return true;
    }

    return undefined;
}

function beforeTouchStart(event: TouchEvent): boolean | undefined {
    if (event.defaultPrevented ||
        event.touches.length === 1 &&
        event.touches[0].target instanceof Element &&
        ignoreElement(event.touches[0].target)) {
        return true;
    }

    return undefined;
}

export class MemoryPanel extends React.Component<IMemoryPanelProps, MemoryPanelState> {
    private viewRef: React.RefObject<MemoryView> = React.createRef();
    private containerRef: React.RefObject<HTMLDivElement> = React.createRef();
    private panZoomReference: PanZoom | null = null;

    public constructor(props: IMemoryPanelProps) {
        super(props);
        this.state = { canResetView: false };
    }

    private get panZoom(): PanZoom {
        return assertNotNull(this.panZoomReference, 'panZoomReference');
    }

    override componentDidMount(): void {
        this.panZoomReference = panzoom(this.getSvg(), {
            minimumDistance: 10,
            beforeMouseDown: filterMouseEvent,
            beforeDoubleClick: filterMouseEvent,
            beforeTouchStart,
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

    override componentDidUpdate(prevProps: IMemoryPanelProps): void {
        // Recenter the memory pointer when it leaves the visible area. Only check this when the memory pointer has
        // moved, to prevent interactions with enabling/disabling the reset view button.
        if (this.props.mp !== prevProps.mp && this.isMPOffscreen()) {
            const [x, y] = this.getMPOffset(this.getScale());
            this.panZoom.smoothMoveTo(x, y);
        }
    }

    override componentWillUnmount(): void {
        this.panZoom.dispose();
    }

    private getContainerSize(): readonly [number, number] {
        const containerStyle = getComputedStyle(this.getContainer());
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

    private getContainer(): HTMLDivElement {
        return assertNotNull(this.containerRef.current, 'containerRef');
    }

    private canResetView(): boolean {
        if (this.panZoomReference === null) {
            return false;
        }
        const { x, y, scale } = this.panZoom.getTransform();
        const [centerX, centerY] = this.getMPOffset();
        return !approximatelyEqual(x, centerX) || !approximatelyEqual(y, centerY) || !approximatelyEqual(scale, 1);
    }

    private readonly updateCanResetView = (): void => {
        const value = this.canResetView();
        if (this.state.canResetView !== value) {
            this.setState({ canResetView: this.canResetView() });
        }
    }

    override render(): JSX.Element {
        const { delay, memory, mp } = this.props;
        return (
            <div id="memoryPanel" className="appPanel">
                <h1>Memory</h1>
                <div id="memoryContainer" ref={this.containerRef}>
                    <MemoryView memory={memory} mp={mp} delay={delay} ref={this.viewRef}/>
                </div>
                <button id="resetViewButton"
                    className="bodyButton"
                    disabled={!this.canResetView()}
                    onClick={this.resetView}
                    title="Reset the position and zoom level of the memory panel.">
                    Reset View
                </button>
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

    override shouldComponentUpdate(nextProps: IMemoryPanelProps): boolean {
        // It slows down the app too much to render the memory panel when executing at maximum speed.
        // Don't render until the execution stops, or the execution speed is reduced.
        return !nextProps.isPlayingAtHighSpeed;
    }
}
