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
    const active = state.active ? 'activeIp' : '';
    const titleExtra = state.active ? '. This is the currently active IP' : '';
    const i = state.number;
    return (
        <React.Fragment key={`IP${i}`}>
            <label className={`col1 ${active}`} title={`Select to show the execution path for instruction pointer ${i}${titleExtra}.`}>
                <input type="radio" name="selectIp" value={i} checked={state.selected} onChange={onSelectedIPChanged}/>
                <span className={`colorSwatch${i}`}></span>
                IP {i}
            </label>
            <p className="col2 right" title={`Coordinates of instruction pointer ${i}`}>{state.coords.q}</p>
            <p className="col3 right" title={`Coordinates of instruction pointer ${i}`}>{state.coords.r}</p>
            <p className="col4" title={`Direction of instruction pointer ${i}`}>{state.dir.toString()}</p>
        </React.Fragment>
    );
}

function getExecutionInfo(ticks) {
    return (
        <>
            <p key="ec" className="extraState col1">Executed Count</p>
            <p key="ec2" className="extraState col2 right">{ticks.toLocaleString('en')}</p>
        </>
    );
}

export class StatePanel extends React.Component {
    render() {
        return (
            <>
                <div id='statePanelTop'>
                    <h1>State</h1>
                    <div id='terminationReasonText'>{this.props.terminationReason}</div>
                </div>
                <div id="stateGrid1">
                    {this.props.ipStates.map(getIPState)}
                    <p key="mp" className="col1" title="Information about the memory pointer">MP</p>
                    <p key="mp1" className="col2 right" title="Coordinates of the memory pointer">{this.props.memoryPointer.q}</p>
                    <p key="mp2" className="col3 right" title="Coordinates of the memory pointer">{this.props.memoryPointer.r}</p>
                    <p key="dir" className="col4" title="Direction of memory pointer">{this.props.memoryDir.toString()}</p>
                    <p key="cw" className="col5" title="Memory pointer direction (clockwise/counterclockwise)">
                        {this.props.memoryCw ? 'CW' : 'CCW'}</p>
                    {getExecutionInfo(this.props.ticks)}
                    <InfoPanel {...this.props.info}/>
                </div>
                <div id="stateGrid2">
                    {getExecutionInfo(this.props.ticks)}
                    <InfoPanel {...this.props.info}/>
                </div>
            </>
        );
    }
}

StatePanel.propTypes = {
    ipStates: PropTypes.arrayOf(PropTypes.shape({
        number: PropTypes.number.isRequired,
        active: PropTypes.bool.isRequired,
        selected: PropTypes.bool.isRequired,
        dir: PropTypes.object.isRequired,
        coords: PropTypes.shape({
            q: PropTypes.number.isRequired,
            r: PropTypes.number.isRequired,
        }).isRequired,
    })).isRequired,
    terminationReason: PropTypes.string,
    ticks: PropTypes.number.isRequired,
    memoryCw: PropTypes.bool.isRequired,
    memoryDir: PropTypes.object.isRequired,
    memoryPointer: PropTypes.shape({
        q: PropTypes.number.isRequired,
        r: PropTypes.number.isRequired,
    }).isRequired,
    info: PropTypes.object.isRequired,
};
