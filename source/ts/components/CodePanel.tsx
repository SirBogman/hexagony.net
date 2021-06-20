import React from 'react';
import panzoom, { PanZoom } from 'panzoom';
import { assertNotNull } from '../view/ViewUtil';

import '../../styles/CodePanel.scss';

function ignoreElement(element: Element): boolean {
    return element instanceof HTMLInputElement || (element.parentElement?.classList.contains('cell') ?? false);
}

function beforeMouseDown(event: MouseEvent): boolean | undefined {
    if (event.defaultPrevented || event.target instanceof Element && ignoreElement(event.target)) {
        return false;
    }

    return undefined;
}

function beforeDoubleClick(event: MouseEvent): boolean | undefined {
    if (event.defaultPrevented || event.target instanceof Element && ignoreElement(event.target)) {
        // Prevent the panzoom library from zooming when double clicking on a hexagon cell.
        return true;
    }

    return undefined;
}

function beforeTouchStart(event: TouchEvent): boolean | undefined {
    if (event.touches.length === 1 &&
        event.touches[0].target instanceof Element &&
        ignoreElement(event.touches[0].target)) {
        // There is only one touch and it's in a hexagon cell. Return false to suppress the default behavior of calling
        // preventDefault and stopPropagation. Otherwise, it would be impossible for the touch to give focus to the
        // hexagon cell for text entry. If the touch moves by the minimum distance required to start a drag, then
        // on touchend, preventDefault will be called and will stop the touch from giving focus to the hexagon cell.
        // Otherwise, when the touch is release, if it has not moved too far from the hexagon cell, according to
        // internal tests by the user agent, then the hexagon cell will get focus.
        return false;
    }

    // Returning undefined means that the library will do its default behavior.
    // The default behavior is to call preventDefault and stopPropagation on the event.
    // This will prevent clicking on a hexagon cell from entering edit mode.
    // It will also prevent a two-touch pinch-zoom from zooming the entire page on iOS Safari,
    // which interferes with zooming in the code panel.
    return undefined;
}

// Props aren't used for this component. The type indicates an empty object.
type CodePanelProps = Record<string, never>;

type CodePanelState = {
    canResetView: boolean;
};

const approximatelyEqual = (x: number, y: number, epsilon = 0.00001): boolean =>
    Math.abs(x - y) < epsilon;

// This is only a pure component because it's implementation is delegated to non-react code.
export class CodePanel extends React.PureComponent<CodePanelProps, CodePanelState> {
    private viewRef: React.RefObject<HTMLDivElement> = React.createRef();
    private panZoomReference: PanZoom | null = null;

    public constructor(props: CodePanelProps) {
        super(props);
        this.state = { canResetView: false };
    }

    componentDidMount(): void {
        const view = assertNotNull(this.viewRef.current, 'viewRef');
        const panZoom = panzoom(view, {
            minimumDistance: 10,
            beforeMouseDown,
            beforeDoubleClick,
            beforeTouchStart,
            zoomDoubleClickSpeed: 1.5,
            // 6.5% zoom per mouse wheel event:
            zoomSpeed: 0.065,
            filterKey: (e: KeyboardEvent) => e.defaultPrevented,
        });

        this.panZoomReference = panZoom;
        // The user may pan with the arrow keys. Use pan, instead of panend.
        this.panZoom.on('pan', this.updateCanResetView);
        this.panZoom.on('zoom', this.updateCanResetView);
        this.panZoom.on('zoomend', this.updateCanResetView);
        this.resetView();
    }

    private readonly updateCanResetView = (): void => {
        console.log('uCSR');
        const { x, y, scale } = this.panZoom.getTransform();
        this.setState({ canResetView:
            !approximatelyEqual(x, 0) || !approximatelyEqual(y, 0) || !approximatelyEqual(scale, 1) });
    };

    private getScale(): number {
        return this.panZoom.getTransform().scale;
    }

    private get panZoom(): PanZoom {
        return assertNotNull(this.panZoomReference, 'panZoomReference');
    }

    private resetView = (): void => {
        // zoomAbs doesn't cancel movement, so the user might have to wait for the memory view to stop drifting
        // (inertia), if that method were used.
        this.panZoom.zoomTo(0, 0, 1.0 / this.getScale());
        this.panZoom.moveTo(0, 0);
        this.updateCanResetView();
    }

    render(): JSX.Element {
        return (
            <div id="codePanel" className="appPanel">
                <div id="codePanelHeader">
                    <h1>Code</h1>
                    <button id="resetCodeViewButton"
                        className="bodyButton"
                        disabled={!this.state.canResetView}
                        onClick={this.resetView}
                        title="Reset the position and zoom level of the view.">
                        Reset View
                    </button>
                </div>
                <div id="codeSvgContainer" ref={this.viewRef}>
                    {/* Focus proxy should be at the top, to prevent the browser from panning to the bottom. */}
                    <div id="focusProxy" tabIndex={0}/>
                    <div id="codeSvgParent">
                        <svg id="codeSvg">
                            <defs>
                                <g className="cell">
                                    <path className="cellPath" d="M17.32 10v-20L0-20l-17.32 10v20L0 20z"/>
                                    <title/>
                                    <text className="cellText" textAnchor="middle" dominantBaseline="central"/>
                                </g>
                                <path className="cellExecutedArrow" d="M-12 0l-5-7.21V7.2L-12 0z"/>
                                <path className="cellBreakpoint" d="M17.32 10v-20L0-20l-17.32 10v20L0 20z"/>
                                <path className="neutralConnector connector" d="M0 0h3.76c2.45 0 4.9 1.98 4.9 4.43v21.14c0 2.45 1.52 4.43 3.96 4.43h4.7"/>
                                <g className="positiveConnector">
                                    <path className="connector" d="M0 0h3.76c2.45 0 4.9 1.98 4.9 4.43v21.14c0 2.45 1.52 4.43 3.96 4.43h4.7"/>
                                    <text className="positiveText" textAnchor="middle" transform="matrix(0 .6 -.6 0 1 5)">+</text>
                                </g>
                                <g className="negativeConnector">
                                    <path className="connector" d="M0 0h3.76c2.45 0 4.9 1.98 4.9 4.43v21.14c0 2.45 1.52 4.43 3.96 4.43h4.7"/>
                                    <text className="negativeText" textAnchor="middle" transform="matrix(0 .6 -.6 0 1 5)">-</text>
                                </g>
                            </defs>
                        </svg>
                    </div>
                </div>
            </div>
        );
    }
}
