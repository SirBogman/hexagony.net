import React from 'react';
import PropTypes from 'prop-types';

export function EditControls(props) {
    const { canDeleteBreakpoints, canEdit, canRedo, canUndo, directionalTyping, onBigger, onDeleteBreakpoints, onRedo,
        onReset, onReverseMemoryMovement, onSmaller, onUndo, toggleDirectionalTyping } = props;

    return (
        <div id="editControls" className="group">
            <button
                role="switch"
                aria-label="Directional Typing"
                aria-checked={directionalTyping}
                onClick={toggleDirectionalTyping}
                title="Toggle directional typing mode.">
                <svg viewBox="0 0 42 50">
                    <polygon fill="none" stroke="currentColor" strokeWidth="3px" points="2 14.03 2 35.97 21 46.94 40 35.97 40 14.03 21 3.06 2 14.03"/>
                    <polygon fill="currentColor" points="11 25 3 14.9 3 35.1 11 25"/>
                    <path fill="currentColor" d="M23,18V35.21H19V18H13.44v-3.2H28.56V18Z"/>
                </svg>
            </button>
            <button
                aria-label="Decrease Size"
                disabled={!canEdit}
                onClick={onSmaller}
                title="Make the hexagon smaller.">
                <svg viewBox="0 0 42 50">
                    <path fill="none" stroke="currentColor" strokeWidth="3px" d="M2 14.03v21.94l19 10.97 19-10.97V14.03L21 3.06 2 14.03z"/>
                    <path fill="currentColor" d="M16.14,26.7V23.3h9.72v3.4Z"/>
                </svg>
            </button>
            <button
                aria-label="Increase Size"
                disabled={!canEdit}
                onClick={onBigger}
                title="Make the hexagon larger.">
                <svg viewBox="0 0 42 50">
                    <path fill="none" stroke="currentColor" strokeWidth="3px" d="M2 14.03v21.94l19 10.97 19-10.97V14.03L21 3.06 2 14.03z"/>
                    <path fill="currentColor" d="M22.77 26.55v6.08h-3.52v-6.08h-5.83v-3.14h5.83v-6h3.52v6h5.82v3.14z"/>
                </svg>
            </button>
            <button
                aria-label="Reset Instructions"
                disabled={!canEdit}
                onClick={onReset}
                title="Reset the hexagon by replacing instructions with no-ops.">
                <svg viewBox="0 0 42 50">
                    <path fill="none" stroke="currentColor" strokeWidth="3px" d="M2 14.03v21.94l19 10.97 19-10.97V14.03L21 3.06 2 14.03z"/>
                    <circle fill="currentColor" cx="20.94" cy="30.34" r="3"/>
                </svg>
            </button>
            <button
                aria-label="Delete Breakpoints"
                disabled={!canDeleteBreakpoints}
                onClick={onDeleteBreakpoints}
                title="Delete all breakpoints. Select an instruction and press Ctrl + B to set a breakpoint.">
                <svg viewBox="0 0 42 50">
                    <path fill="none" stroke="currentColor" strokeWidth="3px" d="M7 49.25L35 .75M8.9 39.95L2 35.97V14.03L21 3.06l6.9 3.98M33.1 10.05l6.9 3.98v21.94L21 46.94l-6.9-3.98"/>
                </svg>
            </button>
            <button
                aria-label="Reverse Memory Movement"
                onClick={onReverseMemoryMovement}
                title="Reverse the direction of all memory movement commands.">
                <svg viewBox="0 0 42 50">
                    <path fill="currentColor" d="M14.82,44c-2.83,0-5-.68-6.34-2s-2.09-3.52-2.09-6.47V30.3a4.66,4.66,0,0,0-.95-3.18,4,4,0,0,0-3.13-1.06H1V22.18H2.31a6.41,6.41,0,0,0,1.88-.24,3,3,0,0,0,1.28-.72A2.85,2.85,0,0,0,6.17,20a6.55,6.55,0,0,0,.22-1.83V14.51a12.9,12.9,0,0,1,.48-3.71A6.16,6.16,0,0,1,11,6.52,12,12,0,0,1,14.82,6h1.72V9.83H15.25a6.13,6.13,0,0,0-1.78.24,3.29,3.29,0,0,0-2.24,2.17,6.47,6.47,0,0,0-.31,2.17V18a11.59,11.59,0,0,1-.26,2.62,4.9,4.9,0,0,1-.79,1.82,3.51,3.51,0,0,1-1.35,1.12,6.54,6.54,0,0,1-1.93.57,4.37,4.37,0,0,1,3.26,1.71,7.69,7.69,0,0,1,1.07,4.5v5.21a6.71,6.71,0,0,0,.31,2.22,3.4,3.4,0,0,0,.88,1.41,3.26,3.26,0,0,0,1.36.76,6.51,6.51,0,0,0,1.78.23h1.29V44Z"/>
                    <path fill="currentColor" d="M27.16,6q4.28,0,6.36,2t2.09,6.49V18a4.66,4.66,0,0,0,.93,3.16,4,4,0,0,0,3.13,1.06H41v3.88H39.67a6.44,6.44,0,0,0-1.88.23,3,3,0,0,0-1.27.73,2.86,2.86,0,0,0-.69,1.26,6.63,6.63,0,0,0-.22,1.84v5.39a12.83,12.83,0,0,1-.48,3.7,6.39,6.39,0,0,1-1.51,2.66A6.53,6.53,0,0,1,31,43.48a12.1,12.1,0,0,1-3.84.54H25.44V40.17h1.31a6.51,6.51,0,0,0,1.78-.23,3.28,3.28,0,0,0,1.36-.77,3.47,3.47,0,0,0,.88-1.41,6.51,6.51,0,0,0,.31-2.17V30.26a11.27,11.27,0,0,1,.26-2.64,5.15,5.15,0,0,1,.77-1.82,3.42,3.42,0,0,1,1.35-1.12,6.86,6.86,0,0,1,1.93-.55,4.45,4.45,0,0,1-3.25-1.73,7.71,7.71,0,0,1-1.06-4.51V14.47a6.81,6.81,0,0,0-.31-2.23,3.37,3.37,0,0,0-.88-1.42,3.26,3.26,0,0,0-1.36-.76,6.51,6.51,0,0,0-1.78-.23H25.44V6Z"/>
                </svg>
            </button>
            <button
                aria-label="Undo"
                disabled={!canUndo}
                onClick={onUndo}
                title="Undo (Ctrl + Z)">
                <svg viewBox="0 0 42 50">
                    <path fill="none" stroke="currentColor" strokeWidth="3px" d="M13.37 13c4.06-2.69 8.56-4.1 14.19-2.06 7 2.56 9.14 9.36 9.56 11.22a15.33 15.33 0 01-5.27 14.62c-4.37 3.32-9 4.09-14.51 2.3-5-1.64-8.83-6.52-8.83-9"/>
                    <path fill="currentColor" d="M20.33 17.9L4.57 20.36l5.75-14.89L20.33 17.9z"/>
                </svg>
            </button>
            <button
                aria-label="Redo"
                disabled={!canRedo}
                onClick={onRedo}
                title="Redo (Ctrl + Y)">
                <svg viewBox="0 0 42 50">
                    <path fill="none" stroke="currentColor" strokeWidth="3px" d="M28.63 13c-4.06-2.68-8.56-4.1-14.19-2-7 2.56-9.14 9.35-9.56 11.21a15.34 15.34 0 005.27 14.63c4.37 3.32 9 4.08 14.51 2.3 5-1.64 8.83-6.52 8.83-9"/>
                    <path fill="currentColor" d="M31.68 5.5l5.75 14.88-15.76-2.45L31.68 5.5z"/>
                </svg>
            </button>
        </div>
    );
}

EditControls.propTypes = {
    canDeleteBreakpoints: PropTypes.bool.isRequired,
    canEdit: PropTypes.bool.isRequired,
    canRedo: PropTypes.bool.isRequired,
    canUndo: PropTypes.bool.isRequired,
    directionalTyping: PropTypes.bool.isRequired,
    onBigger: PropTypes.func.isRequired,
    onDeleteBreakpoints: PropTypes.func.isRequired,
    onRedo: PropTypes.func.isRequired,
    onReset: PropTypes.func.isRequired,
    onReverseMemoryMovement: PropTypes.func.isRequired,
    onSmaller: PropTypes.func.isRequired,
    onUndo: PropTypes.func.isRequired,
    toggleDirectionalTyping: PropTypes.func.isRequired,
};
