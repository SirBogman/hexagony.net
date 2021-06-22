import React from 'react';

interface IHotkeysPanelProps {
    directionalTyping: boolean;
}

const HotkeysPanelFunction: React.FC<IHotkeysPanelProps> = ({ directionalTyping }) => {
    const prefix = directionalTyping ? 'Set the typing direction' : 'Navigate';
    const suffix = directionalTyping ? '' : ' (with wrapping)';

    const space = directionalTyping ?
        <>
            <p className="col1">(Shift) Space/Enter</p>
            <p className="col2">Navigate on the typing direction axis</p>
        </> :
        <>
            <p className="col1">Enter</p>
            <p className="col2">Move to next operator (with wrapping)</p>
        </>;

    return (
        <div id="hotkeysPanel" className="appPanel">
            <h1>Hotkeys</h1>
            <div id="hotkeysGrid">
                {space}
                <p className="col1">Left/Right Arrow</p><p className="col2">{prefix} on the W-E axis{suffix}</p>
                <p className="col1">Up/Down Arrow</p><p className="col2">{prefix} on the NE-SW axis</p>
                <p className="col1">Shift + Up/Down Arrow</p><p className="col2">{prefix} on the NW-SE axis</p>
                <p className="col1">Backspace/Delete</p><p className="col2">Remove operator</p>
                <p className="col1">Ctrl + B</p><p className="col2">Set breakpoint</p>
                <p className="col1">Ctrl + Backspace</p><p className="col2">Step back execution</p>
                <p className="col1">Ctrl + Enter</p><p className="col2">Start/pause execution</p>
                <p className="col1">Ctrl + Shift + Enter</p><p className="col2">Stop Execution</p>
                <p className="col1">Ctrl + .</p><p className="col2">Step (execute next instruction)</p>
            </div>
        </div>
    );
};

export const HotkeysPanel = React.memo(HotkeysPanelFunction);
