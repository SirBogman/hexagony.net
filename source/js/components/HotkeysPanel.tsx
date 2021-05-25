import React from 'react';
import PropTypes from 'prop-types';

interface IHotkeysPanelProps {
    directionalTyping: boolean;
}

function HotkeysPanelFunction({ directionalTyping }: IHotkeysPanelProps) {
    const prefix = directionalTyping ? 'Set the typing direction' : 'Navigate';
    const suffix = directionalTyping ? '' : ' (with wrapping)';
    return (
        <div id="hotkeysPanel">
            <h1>Hotkeys</h1>
            <div id="hotkeysGrid">
                <p className="col1">(Shift) Tab</p><p className="col2">{
                    directionalTyping ?
                        'Navigate on the typing direction axis' :
                        'Navigate on the W-E axis (with wrapping)'
                }</p>
                <p className="col1">Left/Right Arrow</p><p className="col2">{prefix} on the W-E axis{suffix}</p>
                <p className="col1">Up/Down Arrow</p><p className="col2">{prefix} on the NE-SW axis</p>
                <p className="col1">Shift + Up/Down Arrow</p><p className="col2">{prefix} on the NW-SE axis</p>
                <p className="col1">Enter</p><p className="col2">Move to next operator (with wrapping)</p>
                <p className="col1">Backspace/Delete</p><p className="col2">Remove operator</p>
                <p className="col1">Ctrl + B</p><p className="col2">Set breakpoint</p>
                <p className="col1">Ctrl + Enter</p><p className="col2">Start/pause execution</p>
                <p className="col1">Ctrl + Shift + Enter</p><p className="col2">Stop Execution</p>
                <p className="col1">Ctrl + .</p><p className="col2">Step (execute next instruction)</p>
            </div>
        </div>
    );
}

HotkeysPanelFunction.propTypes = {
    directionalTyping: PropTypes.bool.isRequired,
};

export const HotkeysPanel = React.memo(HotkeysPanelFunction);
