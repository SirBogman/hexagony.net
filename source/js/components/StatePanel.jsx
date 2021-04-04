import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { InfoPanel } from './InfoPanel.jsx';

let onSelectedIPChangedCallback;

export function setSelectedIPChangedCallback(callback) {
    onSelectedIPChangedCallback = callback;
}

export function updateStatePanel(element, state) {
    ReactDOM.render(<React.StrictMode><StatePanel {...state}/></React.StrictMode>, element);
}

function onSelectedIPChanged(event) {
    if (onSelectedIPChangedCallback) {
        onSelectedIPChangedCallback(Number(event.target.value));
    }
}

function getIPState(state) {
    const active = state.active ? 'active_ip' : '';
    const titleExtra = state.active ? '. This is the currently active IP' : '';
    const i = state.number;
    return (
        <React.Fragment key={`IP${i}`}>
            <label className={`col1 ${active}`} title={`Show the execution path for instruction pointer ${i}${titleExtra}.`}>
                <input type="radio" name="select_ip" value={i} checked={state.selected} onChange={onSelectedIPChanged}/>
                <span className={`color_swatch_${i}`}></span>
                IP {i}
            </label>
            <p className="col2 right" title="Coordinates of instruction pointer ${i}">{state.coords.q}</p>
            <p className="col3 right" title="Coordinates of instruction pointer ${i}">{state.coords.r}</p>
            <p className="col4" title="Direction of instruction pointer ${i}">{state.dir.toString()}</p>
        </React.Fragment>
    );
}

export class StatePanel extends React.Component {
    render() {
        return (
            <>
                {this.props.ipStates.map(getIPState)}
                <p key="mp" className="col1">Memory Pointer</p>
                <p key="mp1" className="col2 right" title="Coordinates of the memory pointer">{this.props.memoryPointer.q}</p>
                <p key="mp2" className="col3 right" title="Coordinates of the memory pointer">{this.props.memoryPointer.r}</p>
                <p key="dir" className="col4" title="Direction of memory pointer">{this.props.memoryDir.toString()}</p>
                <p key="cw" className="col5" title="Memory pointer direction (clockwise/counterclockwise)">
                    {this.props.memoryCw ? 'CW' : 'CCW'}</p>
                <p key="bp" className="col1">Breakpoints</p>
                <p key="bp1" className="col2 right">{this.propsbreakpoints}</p>
                <p key="ec" className="col1">Executed Count</p>
                <p key="ec2" className="col2 right">{this.props.ticks.toLocaleString('en')}</p>
                <InfoPanel {...this.props.info}/>
            </>
        );
    }
}

StatePanel.propTypes = {
    ipStates: PropTypes.arrayOf(PropTypes.shape({
        number: PropTypes.number,
        active: PropTypes.bool,
        selected: PropTypes.bool,
        dir: PropTypes.object,
        coords: PropTypes.shape({
            q: PropTypes.number,
            r: PropTypes.number,
        }),
    })),
    breakpoints: PropTypes.number,
    ticks: PropTypes.number,
    memoryCw: PropTypes.bool,
    memoryDir: PropTypes.object,
    memoryPointer: PropTypes.shape({
        q: PropTypes.number,
        r: PropTypes.number,
    }),
    info: PropTypes.object,
};
