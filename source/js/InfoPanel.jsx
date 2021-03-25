import React from 'react';
import ReactDOM from 'react-dom';

export function updateInfoPanel(element, info) {
    const infoElement = getInfoText(info.size, info.chars, info.bytes, info.operators);
    ReactDOM.render(<React.StrictMode>{infoElement}</React.StrictMode>, element);
}

export function getInfoText(size, chars, bytes, operators) {
    return (
        <>
            <p key="s1" title="The length of an edge of the hexagon" className="col1">Hexagon Size</p>
            <p key="s2" title="The length of an edge of the hexagon" className="col2 right">{size}</p>
            <p key="c1" title="The number of Unicode codepoints" className="col1">Chars</p>
            <p key="c2" title="The number of Unicode codepoints" className="col2 right">{chars}</p>
            <p key="b1" title="The number of bytes when encoded in UTF-8" className="col1">Bytes</p>
            <p key="b2" title="The number of bytes when encoded in UTF-8" className="col2 right">{bytes}</p>
            <p key="o1" title="The number of instructions that aren't no-ops" className="col1">Operators</p>
            <p key="o2" title="The number of instructions that aren't no-ops" className="col2 right">{operators}</p>
        </>
    );
}
