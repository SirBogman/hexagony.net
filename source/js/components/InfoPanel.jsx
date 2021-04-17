import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';

export function updateInfoPanelHelper(element, info) {
    ReactDOM.render(<React.StrictMode><InfoPanel {...info}/></React.StrictMode>, element);
}

export function getInfoContent(breakpoints, size, chars, bytes, operators) {
    return (
        <>
            <p key="bp" className="extraState col1" title="The number of breakpoints set. Select an instruction and press Ctrl + B to set a breakpoint.">Breakpoints</p>
            <p key="bp1" className="extraState col2 right" title="The number of breakpoints set. Select an instruction and press Ctrl + B to set a breakpoint.">{breakpoints}</p>
            <p key="s1" title="The length of an edge of the hexagon" className="extraState col1">Hexagon Size</p>
            <p key="s2" title="The length of an edge of the hexagon" className="extraState col2 right">{size}</p>
            <p key="c1" title="The number of Unicode codepoints" className="extraState col1">Chars</p>
            <p key="c2" title="The number of Unicode codepoints" className="extraState col2 right">{chars}</p>
            <p key="b1" title="The number of bytes when encoded in UTF-8" className="extraState col1">Bytes</p>
            <p key="b2" title="The number of bytes when encoded in UTF-8" className="extraState col2 right">{bytes}</p>
            <p key="o1" title="The number of instructions that aren't no-ops" className="extraState col1">Operators</p>
            <p key="o2" title="The number of instructions that aren't no-ops" className="extraState col2 right">{operators}</p>
        </>
    );
}

class InfoPanel extends React.Component {
    render() {
        const { breakpoints, size, chars, bytes, operators } = this.props;
        return (
            <>
                <h1>Info</h1>
                <div id="infoInfo">
                    {getInfoContent(breakpoints, size, chars, bytes, operators)}
                </div>
            </>
        );
    }
}

InfoPanel.propTypes = {
    breakpoints: PropTypes.number.isRequired,
    size: PropTypes.number.isRequired,
    bytes: PropTypes.number.isRequired,
    chars: PropTypes.number.isRequired,
    operators: PropTypes.number.isRequired,
};
