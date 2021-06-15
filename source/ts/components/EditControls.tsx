import React, { useState } from 'react';
import { Dropdown, useDropdownToggle } from 'react-overlays';

import { Direction, east } from '../hexagony/Direction';

import { DirectionPickerPopup } from './DirectionPickerPopup';

interface IEditControlProps {
    canDeleteBreakpoints: boolean;
    canEdit: boolean;
    canRedo: boolean;
    canUndo: boolean;
    directionalTyping: boolean;
    onBigger: () => void;
    onDeleteBreakpoints: () => void;
    onRedo: () => void;
    onReset: () => void;
    onReverseMemoryMovement: () => void;
    onSmaller: () => void;
    onTypingDirectionChanged: (value: Direction) => void;
    onUndo: () => void;
    toggleDirectionalTyping: () => void;
    typingDirection: Direction;
}

interface IDirectionPickerToggle {
    directionalTyping: boolean;
    typingDirection: Direction;
}

export const DirectionalTypingIcon : React.FC<{ typingDirection?: Direction }> = ({ typingDirection }) =>
    <svg className="buttonSvg directionalTypingButton" viewBox="0 0 64 56">
        <polygon fill="none" stroke="currentColor" strokeWidth="3px"
            points="13 17.03 13 38.97 32 49.94 51 38.97 51 17.03 32 6.06 13 17.03"/>
        <polygon
            fill="currentColor"
            points="64 28 56 17.9 56 38.1 64 28"
            transform={`rotate(${(typingDirection ?? east).angle},32,28)`}/>
        {/* The letter T */}
        <path fill="currentColor" d="M34,21V38.21H30V21H24.44v-3.2H39.56V21Z"/>
    </svg>;

export const SixWayDirectionalTypingIcon : React.FC = () =>
    <svg className="buttonSvg directionalTypingButton" viewBox="0 0 64 56">
        <polygon fill="none" stroke="currentColor" strokeWidth="3px"
            points="13 17.03 13 38.97 32 49.94 51 38.97 51 17.03 32 6.06 13 17.03"/>
        {[0, 60, 120, 180, 240, 300].map(angle =>
            <polygon key={angle} fill="currentColor" points="64 28 56 17.9 56 38.1 64 28"
                transform={`rotate(${angle},32,28)`}/>)}
        {/* The letter T */}
        <path fill="currentColor" d="M34,21V38.21H30V21H24.44v-3.2H39.56V21Z"/>
    </svg>;

const DirectionPickerToggle: React.FC<IDirectionPickerToggle> = ({ directionalTyping, typingDirection }) => {
    // props may include: ref,onClick,aria-haspopup,aria-expanded.
    const [props] = useDropdownToggle();

    return (
        <button
            aria-label="Directional Typing"
            aria-checked={directionalTyping}
            className="toolbarButton"
            title="Toggle directional typing mode."
            {...props}>
            <DirectionalTypingIcon typingDirection={typingDirection}/>
        </button>
    );
};

export const EditControls: React.FC<IEditControlProps> = ({
    canDeleteBreakpoints,
    canEdit,
    canRedo,
    canUndo,
    directionalTyping,
    onBigger,
    onDeleteBreakpoints,
    onRedo,
    onReset,
    onReverseMemoryMovement,
    onSmaller,
    onTypingDirectionChanged,
    onUndo,
    toggleDirectionalTyping,
    typingDirection
}) => {
    const [showDirectionPicker, setShowDirectionPicker] = useState(false);

    return (
        <div id="editControls" className="group">
            <Dropdown
                show={showDirectionPicker}
                itemSelector=".directionPickerButton"
                onToggle={setShowDirectionPicker}>
                <DirectionPickerToggle
                    directionalTyping={directionalTyping}
                    typingDirection={typingDirection}/>
                <DirectionPickerPopup
                    direction={directionalTyping ? typingDirection : null}
                    directionalTyping={directionalTyping}
                    onTypingDirectionChanged={onTypingDirectionChanged}
                    toggleDirectionalTyping={toggleDirectionalTyping}/>
            </Dropdown>
            <button
                aria-label="Decrease Size"
                className="toolbarButton"
                disabled={!canEdit}
                onClick={onSmaller}
                title="Make the hexagon smaller.">
                <svg className="buttonSvg" viewBox="0 0 42 50">
                    <path fill="none" stroke="currentColor" strokeWidth="3px" d="M2 14.03v21.94l19 10.97 19-10.97V14.03L21 3.06 2 14.03z"/>
                    <path fill="currentColor" d="M16.14,26.7V23.3h9.72v3.4Z"/>
                </svg>
            </button>
            <button
                aria-label="Increase Size"
                className="toolbarButton"
                disabled={!canEdit}
                onClick={onBigger}
                title="Make the hexagon larger.">
                <svg className="buttonSvg" viewBox="0 0 42 50">
                    <path fill="none" stroke="currentColor" strokeWidth="3px" d="M2 14.03v21.94l19 10.97 19-10.97V14.03L21 3.06 2 14.03z"/>
                    <path fill="currentColor" d="M22.77 26.55v6.08h-3.52v-6.08h-5.83v-3.14h5.83v-6h3.52v6h5.82v3.14z"/>
                </svg>
            </button>
            <button
                aria-label="Reset Instructions"
                className="toolbarButton"
                disabled={!canEdit}
                onClick={onReset}
                title="Reset the hexagon by replacing instructions with no-ops.">
                <svg className="buttonSvg" viewBox="0 0 42 50">
                    <path fill="none" stroke="currentColor" strokeWidth="3px" d="M2 14.03v21.94l19 10.97 19-10.97V14.03L21 3.06 2 14.03z"/>
                    <circle fill="currentColor" cx="20.94" cy="30.34" r="3"/>
                </svg>
            </button>
            <button
                aria-label="Delete Breakpoints"
                className="largeToolbarOnly toolbarButton"
                disabled={!canDeleteBreakpoints}
                onClick={onDeleteBreakpoints}
                title="Delete all breakpoints. Select an instruction and press Ctrl + B to set a breakpoint.">
                <svg className="buttonSvg" viewBox="0 0 42 50">
                    <path fill="none" stroke="currentColor" strokeWidth="3px" d="M7 49.25L35 .75M8.9 39.95L2 35.97V14.03L21 3.06l6.9 3.98M33.1 10.05l6.9 3.98v21.94L21 46.94l-6.9-3.98"/>
                </svg>
            </button>
            <button
                aria-label="Reverse Memory Movement"
                className="largeToolbarOnly toolbarButton"
                onClick={onReverseMemoryMovement}
                title="Reverse the direction of all memory movement commands.">
                <svg className="buttonSvg" viewBox="0 0 42 50">
                    <path fill="currentColor" d="M16.29,44.05H14.78q-4,0-5.89-1.85T7,36.57V29.51a6.5,6.5,0,0,0-.22-1.79A3,3,0,0,0,6,26.38a3.86,3.86,0,0,0-1.5-.83,8.17,8.17,0,0,0-2.35-.28H1.22V22.42H2.1a10.11,10.11,0,0,0,2.44-.25A3.28,3.28,0,0,0,6,21.42a2.68,2.68,0,0,0,.74-1.28A7.64,7.64,0,0,0,7,18.29V13.43a11,11,0,0,1,.41-3.1A5.65,5.65,0,0,1,8.72,8a6,6,0,0,1,2.42-1.5A11,11,0,0,1,14.78,6h1.51V8.82H15.08q-4.76,0-4.75,4.61v4.78c0,3.34-1.45,5.22-4.33,5.64q4.37.43,4.37,5.62v7q0,4.69,4.71,4.69h1.21Z"/>
                    <path fill="currentColor" d="M25.69,6H27.2q4,0,5.89,1.85C34.37,9,35,10.92,35,13.43v4.74a6.62,6.62,0,0,0,.22,1.8A3,3,0,0,0,36,21.3a3.71,3.71,0,0,0,1.51.83,8.25,8.25,0,0,0,2.36.29h.88v2.85H39.9a10.26,10.26,0,0,0-2.45.24,3.48,3.48,0,0,0-1.49.75,2.65,2.65,0,0,0-.74,1.28,7.7,7.7,0,0,0-.2,1.85v7.18a11,11,0,0,1-.41,3.1A5.74,5.74,0,0,1,33.27,42a5.94,5.94,0,0,1-2.42,1.5,11.06,11.06,0,0,1-3.65.52H25.69V41.18h1.23q4.72,0,4.73-4.61v-7.1c0-3.33,1.45-5.21,4.33-5.62q-4.36-.47-4.37-5.64V13.52q0-4.69-4.69-4.7H25.69Z"/>
                </svg>
            </button>
            <button
                aria-label="Undo"
                className="toolbarButton"
                disabled={!canUndo}
                onClick={onUndo}
                title="Undo (Ctrl + Z)">
                <svg className="buttonSvg" viewBox="0 0 42 50">
                    <path fill="none" stroke="currentColor" strokeWidth="3px" d="M13.37 13c4.06-2.69 8.56-4.1 14.19-2.06 7 2.56 9.14 9.36 9.56 11.22a15.33 15.33 0 01-5.27 14.62c-4.37 3.32-9 4.09-14.51 2.3-5-1.64-8.83-6.52-8.83-9"/>
                    <path fill="currentColor" d="M20.33 17.9L4.57 20.36l5.75-14.89L20.33 17.9z"/>
                </svg>
            </button>
            <button
                aria-label="Redo"
                className="toolbarButton"
                disabled={!canRedo}
                onClick={onRedo}
                title="Redo (Ctrl + Y)">
                <svg className="buttonSvg" viewBox="0 0 42 50">
                    <path fill="none" stroke="currentColor" strokeWidth="3px" d="M28.63 13c-4.06-2.68-8.56-4.1-14.19-2-7 2.56-9.14 9.35-9.56 11.21a15.34 15.34 0 005.27 14.63c4.37 3.32 9 4.08 14.51 2.3 5-1.64 8.83-6.52 8.83-9"/>
                    <path fill="currentColor" d="M31.68 5.5l5.75 14.88-15.76-2.45L31.68 5.5z"/>
                </svg>
            </button>
        </div>
    );
};
