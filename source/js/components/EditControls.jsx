import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';

export function updateEditControlsHelper(element, props) {
    ReactDOM.render(
        <React.StrictMode><EditControls {...props}/></React.StrictMode>,
        element);
}

function EditControls(props) {
    const { canDeleteBreakpoints, canEdit, canRedo, canUndo, onBigger, onDeleteBreakpoints, onRedo,
        onReset, onSmaller, onUndo } = props;

    return (
        <>
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
        </>
    );
}

EditControls.propTypes = {
    canDeleteBreakpoints: PropTypes.bool.isRequired,
    canEdit: PropTypes.bool.isRequired,
    canRedo: PropTypes.bool.isRequired,
    canUndo: PropTypes.bool.isRequired,
    onBigger: PropTypes.func.isRequired,
    onDeleteBreakpoints: PropTypes.func.isRequired,
    onRedo: PropTypes.func.isRequired,
    onReset: PropTypes.func.isRequired,
    onSmaller: PropTypes.func.isRequired,
    onUndo: PropTypes.func.isRequired,
};
