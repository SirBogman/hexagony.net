import classNames from 'classnames';
import React, { useState } from 'react';

interface IPlayControlsProps {
    canPlayPause: boolean;
    canStep: boolean;
    canStepBack: boolean;
    canStop: boolean;
    delay: number;
    isPlaying: boolean;
    onPlayPause: () => void;
    onSpeedSliderChanged: (rawValue: number) => void,
    onStep: () => void;
    onStepBack: () => void;
    onStop: () => void;
}

const PauseIcon: React.FC = () =>
    <svg className="buttonSvg" viewBox="0 0 50 50">
        <rect fill="currentColor" x="5" width="13.33" height="50"/>
        <rect fill="currentColor" x="31.67" width="13.33" height="50"/>
    </svg>;

export const PlayIcon: React.FC = () =>
    <svg className="buttonSvg" viewBox="0 0 50 50">
        <path fill="currentColor" d="M5,0V50L45,25Z"/>
    </svg>;

export const StepBackIcon: React.FC = () =>
    <svg className="buttonSvg" viewBox="0 0 50 50">
        <rect fill="currentColor" x="5.02" y="7" width="7" height="36"/>
        <path fill="currentColor" d="M45,43V7L17,25Z"/>
    </svg>;

const StepIcon: React.FC = () =>
    <svg className="buttonSvg" viewBox="0 0 50 50">
        <rect fill="currentColor" x="37.98" y="7" width="7" height="36"/>
        <path fill="currentColor" d="M5,7V43L33,25Z"/>
    </svg>;

const StopIcon: React.FC = () =>
    <svg className="buttonSvg" viewBox="0 0 50 50">
        <path fill="currentColor" d="M5,5V45H45V5Z"/>
    </svg>;

export const PlayControls: React.FC<IPlayControlsProps> = ({
    canPlayPause,
    canStep,
    canStepBack,
    canStop,
    delay,
    isPlaying,
    onPlayPause,
    onSpeedSliderChanged,
    onStep,
    onStepBack,
    onStop
}) => {
    const [speedSliderFocused, setSpeedSliderFocused] = useState(false);

    return (
        <div id="playControls" className="group">
            <button
                aria-label="Start/Pause"
                className="toolbarButton"
                disabled={!canPlayPause}
                onClick={onPlayPause}
                title="Start/pause execution (Ctrl + Enter).">
                {isPlaying ? <PauseIcon/> : <PlayIcon/>}
            </button>
            <button
                aria-label="Step Back"
                className="toolbarButton"
                disabled={!canStepBack}
                onClick={onStepBack}
                title="Step back (Ctrl + Backspace).">
                <StepBackIcon/>
            </button>
            <button
                aria-label="Step"
                className="toolbarButton"
                disabled={!canStep}
                onClick={onStep}
                title="Execute next instruction (Ctrl + .).">
                <StepIcon/>
            </button>
            <button
                aria-label="Stop"
                className="toolbarButton"
                disabled={!canStop}
                onClick={onStop}
                title="Stop execution (Ctrl + Shift + Enter).">
                <StopIcon/>
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
