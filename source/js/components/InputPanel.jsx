import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';

export function updateInputPanelHelper(element, props) {
    ReactDOM.render(
        <React.StrictMode><InputPanel {...props}/></React.StrictMode>,
        element);
}

export const inputModeArguments = 'arg';
export const inputModeRaw = 'raw';

export function isValidInputMode(inputMode) {
    return inputMode === inputModeArguments || inputMode === inputModeRaw;
}

function InputPanel(props) {
    const { input, inputMode, onInputChanged, onInputModeChanged } = props;

    return (
        <>
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
                spellCheck="False"
                autoCapitalize="off"
                autoComplete="off"
                aria-label="Input"
                value={input}
                onInput={e => onInputChanged(e.target.value)}/>
        </>
    );
}

InputPanel.propTypes = {
    input: PropTypes.string.isRequired,
    inputMode: PropTypes.string.isRequired,
    onInputChanged: PropTypes.func.isRequired,
    onInputModeChanged: PropTypes.func.isRequired,
};
