import React from 'react';

import '../../styles/CodePanel.scss';

// This is only a pure component because it's implementation is delegated to non-react code.
export class CodePanel extends React.PureComponent {
    override render(): JSX.Element {
        return (
            // Setting tabIndex on the top level panel allows the user to horizontally scroll, if necessary, with the
            // keyboard. Firefox doesn't require tabIndex for this, but Chrome does.
            <div id="codePanel" className="appPanel" tabIndex={0}>
                <div className="codePanelHeader">
                    <h1 title="Enter your hexagony code in the Code panel.">Code</h1>
                </div>
                <div id="focusProxy" tabIndex={0}/>
                <div id="codeSvgContainer">
                    {/* Focus proxy should be at the top, to prevent the browser from panning to the bottom. */}
                    <svg id="codeSvg" overflow="visible">
                        <defs>
                            <g className="cell">
                                <path className="cellPath" d="M17.32 10v-20L0-20l-17.32 10v20L0 20z"/>
                                <title/>
                                <text className="cellText" textAnchor="middle" dominantBaseline="central"/>
                            </g>
                            <path className="cellExecutedArrow" d="M-12 0l-5-7.21V7.2L-12 0z"/>
                            <path className="cellBreakpoint" d="M17.32 10v-20L0-20l-17.32 10v20L0 20z"/>
                            <path className="neutralConnector connector"
                                d="M0 0h3.76c2.45 0 4.9 1.98 4.9 4.43v21.14c0 2.45 1.52 4.43 3.96 4.43h4.7"/>
                            <g className="positiveConnector">
                                <path className="connector"
                                    d="M0 0h3.76c2.45 0 4.9 1.98 4.9 4.43v21.14c0 2.45 1.52 4.43 3.96 4.43h4.7"/>
                                <text className="positiveText" textAnchor="middle" transform="matrix(0 .6 -.6 0 1 5)">
                                    +
                                </text>
                            </g>
                            <g className="negativeConnector">
                                <path className="connector"
                                    d="M0 0h3.76c2.45 0 4.9 1.98 4.9 4.43v21.14c0 2.45 1.52 4.43 3.96 4.43h4.7"/>
                                <text className="negativeText" textAnchor="middle" transform="matrix(0 .6 -.6 0 1 5)">
                                    -
                                </text>
                            </g>
                        </defs>
                    </svg>
                </div>
            </div>
        );
    }
}
