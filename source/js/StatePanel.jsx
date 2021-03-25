import React from 'react';
import ReactDOM from 'react-dom';
import { getInfoText } from './InfoPanel.jsx';

let onSelectedIPChangedCallback;

export function setSelectedIPChangedCallback(callback) {
    onSelectedIPChangedCallback = callback;
}

export function updateStatePanel(element, state) {
    ReactDOM.render(<React.StrictMode>{makeStatePanel(state)}</React.StrictMode>, element);
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

function makeStatePanel(state) {
    const info = state.info;
    return (
        <>
            {state.ipStates.map(getIPState)}
            <p key="mp" className="col1">Memory Pointer</p>
            <p key="mp1" className="col2 right" title="Coordinates of the memory pointer">{state.memoryPointer.q}</p>
            <p key="mp2" className="col3 right" title="Coordinates of the memory pointer">{state.memoryPointer.r}</p>
            <p key="dir" className="col4" title="Direction of memory pointer">{state.memoryDir.toString()}</p>
            <p key="cw" className="col5" title="Memory pointer direction (clockwise/counterclockwise)">
                {state.memoryCw ? 'CW' : 'CCW'}</p>
            <p key="bp" className="col1">Breakpoints</p>
            <p key="bp1" className="col2 right">{state.breakpoints}</p>
            <p key="ec" className="col1">Executed Count</p>
            <p key="ec2" className="col2 right">{state.ticks}</p>
            {getInfoText(info.size, info.chars, info.bytes, info.operators)}
        </>);
}
