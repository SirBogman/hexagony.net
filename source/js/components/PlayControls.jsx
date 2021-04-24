import React, { useState } from 'react';
import PropTypes from 'prop-types';

export function PlayControls(props) {
    const [speedSliderFocused, setSpeedSliderFocused] = useState(false);
    const { canPlayPause, canStep, canStop, delay, isPlaying, onPlayPause, onSpeedSliderChanged,
        onStep, onStop } = props;

    const playPause = isPlaying ?
        <svg viewBox="0 -2 12 20"><path fill="currentColor" d="M0 0h4v16H0zM8 0h4v16H8z"/></svg> :
        <svg viewBox="0 0 16 16"><path fill="currentColor" d="M0 0v16l16-8z"/></svg>;

    return (
        <div id="playControls" className="group">
            <button
                aria-label="Start/Pause"
                disabled={!canPlayPause}
                onClick={onPlayPause}
                title="Start/pause execution (Ctrl + Enter).">
                {playPause}
            </button>
            <button
                aria-label="Step"
                disabled={!canStep}
                onClick={onStep}
                title="Execute next instruction (Ctrl + .).">
                <svg viewBox="0 0 16 16">
                    <path fill="none" stroke="currentColor" strokeWidth="1.5px" d="M.75.75v14.5L15.25 8z"/>
                </svg>
            </button>
            <button
                aria-label="Stop"
                disabled={!canStop}
                onClick={onStop}
                title="Stop execution (Ctrl + Shift + Enter).">
                <svg viewBox="-2 -2 20 20">
                    <path fill="currentColor" d="M0 0v16h16V0z"/>
                </svg>
            </button>
            <div id="speedSliderContainer" title="Adjust the execution speed."
                className={speedSliderFocused ? 'focused' : ''}>
                <input
                    type="range"
                    aria-label="Execution Speed"
                    min="0"
                    max="1000"
                    value={1000 - Math.sqrt(1000 * delay)}
                    step="10"
                    id="speedSlider"
                    onInput={e => onSpeedSliderChanged(e.target.value)}
                    onBlur={() => setSpeedSliderFocused(false)}
                    onFocus={() => setSpeedSliderFocused(true)}/>
            </div>
        </div>
    );
}

PlayControls.propTypes = {
    canPlayPause: PropTypes.bool.isRequired,
    canStep: PropTypes.bool.isRequired,
    canStop: PropTypes.bool.isRequired,
    delay: PropTypes.number.isRequired,
    isPlaying: PropTypes.bool.isRequired,
    onPlayPause: PropTypes.func.isRequired,
    onSpeedSliderChanged: PropTypes.func.isRequired,
    onStep: PropTypes.func.isRequired,
    onStop: PropTypes.func.isRequired,
};
