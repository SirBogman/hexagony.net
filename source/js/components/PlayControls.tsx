import classNames from 'classnames';
import React, { useState } from 'react';

interface IPlayControlsProps {
    canPlayPause: boolean;
    canStep: boolean;
    canStop: boolean;
    delay: number;
    isPlaying: boolean;
    onPlayPause: () => void;
    onSpeedSliderChanged: (rawValue: number) => void,
    onStep: () => void;
    onStop: () => void;
}

export const PlayControls: React.FC<IPlayControlsProps> = props => {
    const [speedSliderFocused, setSpeedSliderFocused] = useState(false);
    const { canPlayPause, canStep, canStop, delay, isPlaying, onPlayPause, onSpeedSliderChanged,
        onStep, onStop } = props;

    const playPause = isPlaying ?
        <svg className="buttonSvg" viewBox="0 -2 12 20"><path fill="currentColor" d="M0 0h4v16H0zM8 0h4v16H8z"/></svg> :
        <svg className="buttonSvg" viewBox="0 0 16 16"><path fill="currentColor" d="M0 0v16l16-8z"/></svg>;

    return (
        <div id="playControls" className="group">
            <button
                aria-label="Start/Pause"
                className="toolbarButton"
                disabled={!canPlayPause}
                onClick={onPlayPause}
                title="Start/pause execution (Ctrl + Enter).">
                {playPause}
            </button>
            <button
                aria-label="Step"
                className="toolbarButton"
                disabled={!canStep}
                onClick={onStep}
                title="Execute next instruction (Ctrl + .).">
                <svg className="buttonSvg" viewBox="0 0 16 16">
                    <path fill="none" stroke="currentColor" strokeWidth="1.5px" d="M.75.75v14.5L15.25 8z"/>
                </svg>
            </button>
            <button
                aria-label="Stop"
                className="toolbarButton"
                disabled={!canStop}
                onClick={onStop}
                title="Stop execution (Ctrl + Shift + Enter).">
                <svg className="buttonSvg" viewBox="-2 -2 20 20">
                    <path fill="currentColor" d="M0 0v16h16V0z"/>
                </svg>
            </button>
            <div id="speedSliderContainer" title="Adjust the execution speed."
                className={classNames({ focused: speedSliderFocused })}>
                <input
                    type="range"
                    aria-label="Execution Speed"
                    min="0"
                    max="1000"
                    value={1000 - Math.sqrt(1000 * delay)}
                    step="10"
                    id="speedSlider"
                    onInput={e => onSpeedSliderChanged(Number((e.target as HTMLInputElement).value))}
                    onBlur={() => setSpeedSliderFocused(false)}
                    onFocus={() => setSpeedSliderFocused(true)}/>
            </div>
        </div>
    );
};
