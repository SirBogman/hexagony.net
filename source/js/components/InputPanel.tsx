import React from 'react';
import PropTypes from 'prop-types';

export const inputModeArguments = 'arg';
export const inputModeRaw = 'raw';

export function isValidInputMode(inputMode: string): boolean {
    return inputMode === inputModeArguments || inputMode === inputModeRaw;
}

interface IInputPanelProps {
    input: string;
    inputMode: string;
    onInputChanged: (value: string) => void;
    onInputModeChanged: (value: string) => void;
}

export function InputPanel(props: IInputPanelProps): JSX.Element {
    const { input, inputMode, onInputChanged, onInputModeChanged } = props;

    return (
        <div id="inputPanel">
            <h1>Input</h1>
            <div className="radio">
                <label title="Arguments input mode: each line of input is considered an argument and arguments are separate by null characters (ASCII 0). This is compatible with Code Golf.">
                    <input
                        type="radio"
                        name="inputMode"
                        value={inputModeArguments}
                        checked={inputMode === inputModeArguments}
                        onChange={() => onInputModeChanged(inputModeArguments)}/>
                    Arguments
                </label>
                <label title="Raw input mode: the input is passed to the Hexagony program directly.">
                    <input
                        type="radio"
                        name="inputMode"
                        value={inputModeRaw}
                        checked={inputMode === inputModeRaw}
                        onChange={() => onInputModeChanged(inputModeRaw)}/>
                    Raw
                </label>
            </div>
            <textarea
                id="inputBox"
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                aria-label="Input"
                value={input}
                onInput={e => onInputChanged((e.target as HTMLTextAreaElement).value)}/>
        </div>
    );
}

InputPanel.propTypes = {
    input: PropTypes.string.isRequired,
    inputMode: PropTypes.string.isRequired,
    onInputChanged: PropTypes.func.isRequired,
    onInputModeChanged: PropTypes.func.isRequired,
};
