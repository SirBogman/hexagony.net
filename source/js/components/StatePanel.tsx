import React from 'react';
import PropTypes from 'prop-types';
import { getInfoContent, IInfoPanelProps } from './InfoPanel';
import { Direction } from '../hexagony/Direction';
import { PointAxial } from '../hexagony/PointAxial';

interface IIPState {
    number: number;
    active: boolean;
    selected: boolean;
    dir: Direction;
    coords: PointAxial;
}

interface IStatePanelProps {
    colorMode: string;
    colorOffset: number;
    cycleColorOffset: () => void;
    ipStates: IIPState[];
    terminationReason: string | null;
    ticks: number;
    memoryCw: boolean;
    memoryDir: Direction;
    memoryEdges: number;
    memoryPointer: PointAxial;
    info: IInfoPanelProps;
    onSelectedIPChanged: (ip: number) => void;
}

function getIPState(
    state: IIPState,
    colorMode: string,
    colorOffset: number,
    onSelectedIPChanged: (ip: number) => void) {
    const active = state.active ? 'activeIp' : '';
    const titleExtra = state.active ? '. This is the currently active IP' : '';
    const i = state.number;
    return (
        <React.Fragment key={`IP${i}`}>
            <label className={`col1 ${active}`} title={`Select to show the execution path for instruction pointer ${i}${titleExtra}.`}>
                <input type="radio" name="selectIp" value={i} checked={state.selected} onChange={() => onSelectedIPChanged(i)}/>
                <span className={`colorSwatch${(i + colorOffset) % 6}${colorMode}`}></span>
                IP {i}
            </label>
            <p className="col2 right" title={`Coordinates of instruction pointer ${i}`}>{state.coords.q}</p>
            <p className="col3 right" title={`Coordinates of instruction pointer ${i}`}>{state.coords.r}</p>
            <p className="col4" title={`Direction of instruction pointer ${i}`}>{state.dir.toString()}</p>
        </React.Fragment>
    );
}

function getExecutionInfo(ticks: number, memoryEdges: number) {
    return (
        <>
            <p key="ec" className="extraState col1" title="Number of executed instructions">Executed</p>
            <p key="ec2" className="extraState col2 right" title="Number of executed instructions">{ticks.toLocaleString('en')}</p>
            <p key="mc" className="extraState col1" title="Number of memory edges storing data">Memory Edges</p>
            <p key="mc2" className="extraState col2 right" title="Number of memory edges storing data">{memoryEdges.toLocaleString('en')}</p>
        </>
    );
}

export function StatePanel(props: IStatePanelProps) {
    const { colorMode, colorOffset, cycleColorOffset, terminationReason, memoryPointer, memoryDir,
        memoryCw, memoryEdges, ticks, info, ipStates, onSelectedIPChanged } = props;
    return (
        <div id="statePanel">
            <div id='statePanelTop'>
                <h1>State</h1>
                <div id='terminationReasonText'>{terminationReason}</div>
                <button id="cycleColorsButton" className="bodyButton" onClick={cycleColorOffset}
                    title="Cycle the colors of the instruction pointers.">
                    Cycle Colors
                </button>
            </div>
            <div id="stateGrid1">
                {ipStates.map(x => getIPState(x, colorMode, colorOffset, onSelectedIPChanged))}
                <p key="mp" className="col1" title="Information about the memory pointer">MP</p>
                <p key="mp1" className="col2 right" title="Coordinates of the memory pointer">{memoryPointer.q}</p>
                <p key="mp2" className="col3 right" title="Coordinates of the memory pointer">{memoryPointer.r}</p>
                <p key="dir" className="col4" title="Direction of memory pointer">{memoryDir.toString()}</p>
                <p key="cw" className="col5" title="Memory pointer direction (clockwise/counterclockwise)">
                    {memoryCw ? 'CW' : 'CCW'}</p>
                {getExecutionInfo(ticks, memoryEdges)}
                {getInfoContent(info)}
            </div>
            <div id="stateGrid2">
                {getExecutionInfo(ticks, memoryEdges)}
                {getInfoContent(info)}
            </div>
        </div>
    );
}

StatePanel.propTypes = {
    colorMode: PropTypes.string.isRequired,
    colorOffset: PropTypes.number.isRequired,
    cycleColorOffset: PropTypes.func.isRequired,
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
    memoryEdges: PropTypes.number.isRequired,
    memoryPointer: PropTypes.shape({
        q: PropTypes.number.isRequired,
        r: PropTypes.number.isRequired,
    }).isRequired,
    info: PropTypes.shape({
        breakpoints: PropTypes.number.isRequired,
        size: PropTypes.number.isRequired,
        bytes: PropTypes.number.isRequired,
        chars: PropTypes.number.isRequired,
        operators: PropTypes.number.isRequired,
    }).isRequired,
    onSelectedIPChanged: PropTypes.func.isRequired,
};
