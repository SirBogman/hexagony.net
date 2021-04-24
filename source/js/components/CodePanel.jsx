import React from 'react';

// This is only a pure component because it's implementation is delegated to non-react code.
export class CodePanel extends React.PureComponent {
    render() {
        return (
            <div id="codePanel">
                <div id="codeSvgContainer">
                    <noscript>You need to enable JavaScript to run this app.</noscript>
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
                                    <text className="positiveText" textAnchor="middle" transform="matrix(0 .6 -.6 0 0 5)">+</text>
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
