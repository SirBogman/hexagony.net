import React from 'react';

interface IViewControlsProps {
    edgeTransitionModeEnabled: boolean;
    arrowsEnabled: boolean;
    ipsEnabled: boolean;
    darkModeEnabled: boolean;
    toggleEdgeTransitionMode: () => void;
    toggleArrows: () => void;
    toggleIPs: () => void;
    toggleDarkMode: () => void;
}

export const EdgeTransitionModeIcon: React.FC = () =>
    <svg className="buttonSvg" viewBox="-2 0 26.99 29.5">
        <path fill="none" stroke="currentColor" strokeWidth="2px"
            d={'M20.04.25l1.82 3.15c1.18 2.05.71 5.06-1.34 6.24L2.82 19.86c-2.05 1.18-3 3.41-1.79 5.46l2.27 3.93m16.7' +
               '4 0l1.82-3.15c1.18-2.05.71-5.06-1.34-6.24L2.82 9.64c-2.05-1.18-3-3.41-1.79-5.46L3.3.25'}/>
    </svg>;

export const ShowArrowsIcon: React.FC = () =>
    <svg className="buttonSvg" viewBox="0 0 42 50">
        <path fill="none" stroke="currentColor" strokeWidth="3px"
            d="M2 14.03v21.94l19 10.97 19-10.97V14.03L21 3.06 2 14.03z"/>
        <path fill="currentColor" d="M11 25L3 14.9v20.2L11 25z"/>
        <path fill="currentColor" d="M11 25L3 14.9v20.2L11 25z" transform="rotate(240,21,25)"/>
    </svg>;

export const ShowInstructionPointersIcon: React.FC = () =>
    <svg className="buttonSvg" viewBox="0 0 42 50">
        <path fill="currentColor"
            d={'M8.58 7.92v4.46l3.85 2.22 3.86-2.22V7.92L12.43 5.7 8.58 7.92zM25.71 7.92v4.46l3.86 2.22 3.85-2.22V7.9' +
               '2L29.57 5.7l-3.86 2.22zM34.28 22.77v4.46l3.86 2.22L42 27.23v-4.46l-3.86-2.22-3.86 2.22zM0 22.77v4.46l' +
               '3.86 2.22 3.85-2.22v-4.46l-3.85-2.22L0 22.77zM8.58 37.62v4.46l3.85 2.22 3.86-2.22v-4.46l-3.86-2.22-3.' +
               '85 2.22zM25.71 37.62v4.46l3.86 2.22 3.85-2.22v-4.46l-3.85-2.22-3.86 2.22z'}/>
    </svg>;

const DarkModeIcon: React.FC = () =>
    <svg className="buttonSvg" viewBox="0 0 42 50">
        <path fill="currentColor" d="M27.06,45.11a21,21,0,1,1,0-40.22,21,21,0,0,0,0,40.22Z"/>
    </svg>;

export const ViewControls: React.FC<IViewControlsProps> = ({
    edgeTransitionModeEnabled,
    arrowsEnabled,
    ipsEnabled,
    darkModeEnabled,
    toggleEdgeTransitionMode,
    toggleArrows,
    toggleIPs,
    toggleDarkMode
}) =>
    <div id="viewControls" className="group">
        <button
            role="switch"
            aria-label="Edge Transition Mode"
            aria-checked={edgeTransitionModeEnabled}
            className="toolbarButton"
            onClick={toggleEdgeTransitionMode}
            title="Toggle edge transition visualization.">
            <EdgeTransitionModeIcon/>
        </button>
        <button
            role="switch"
            aria-label="Show Arrows"
            aria-checked={arrowsEnabled}
            className="toolbarButton"
            onClick={toggleArrows}
            title="Toggle execution history: shows the directions that the instruction pointer moved over each cell.">
            <ShowArrowsIcon/>
        </button>
        <button
            role="switch"
            aria-label="Show Instruction Pointers"
            aria-checked={ipsEnabled}
            className="toolbarButton"
            onClick={toggleIPs}
            title="Toggle whether all 6 instruction pointers are shown.">
            <ShowInstructionPointersIcon/>
        </button>
        <button
            role="switch"
            aria-label="Toggle Dark Mode"
            aria-checked={darkModeEnabled}
            className="toolbarButton"
            onClick={toggleDarkMode}
            title="Toggle whether dark mode is enabled.">
            <DarkModeIcon/>
        </button>
    </div>;
