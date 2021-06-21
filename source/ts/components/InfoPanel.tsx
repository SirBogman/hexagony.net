import React from 'react';

export interface IInfoPanelProps {
    breakpoints: number;
    size: number;
    bytes: number;
    chars: number;
    operators: number;
}

const breakpointsTitle = 'The number of breakpoints set. Select an instruction and press Ctrl + B to set a breakpoint.';

export const InfoContent: React.FC<IInfoPanelProps> = ({
    breakpoints,
    size,
    chars,
    bytes,
    operators
}) =>
    <>
        <p key="bp" className="extraState col1" title={breakpointsTitle}>Breakpoints</p>
        <p key="bp1" className="extraState col2 right" title={breakpointsTitle}>{breakpoints}</p>
        <p key="s1" title="The length of an edge of the hexagon" className="extraState col1">Hexagon Size</p>
        <p key="s2" title="The length of an edge of the hexagon" className="extraState col2 right">{size}</p>
        <p key="c1" title="The number of Unicode codepoints" className="extraState col1">Chars</p>
        <p key="c2" title="The number of Unicode codepoints" className="extraState col2 right">{chars}</p>
        <p key="b1" title="The number of bytes when encoded in UTF-8" className="extraState col1">Bytes</p>
        <p key="b2" title="The number of bytes when encoded in UTF-8" className="extraState col2 right">{bytes}</p>
        <p key="o1" title="The number of instructions that aren't no-ops" className="extraState col1">Operators</p>
        <p key="o2" title="The number of instructions that aren't no-ops" className="extraState col2 right">
            {operators}
        </p>
    </>;

export const InfoPanel: React.FC<IInfoPanelProps> = props =>
    <div id="infoPanel" className="appPanel">
        <h1>Info</h1>
        <div id="infoInfo">
            <InfoContent {...props}/>
        </div>
    </div>;
