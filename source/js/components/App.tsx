import React from 'react';
import ReactDOM from 'react-dom';
import { produce } from 'immer';

import { Direction, DirectionString, east } from '../hexagony/Direction';
import { Hexagony } from '../hexagony/Hexagony';
import { ISourceCode, SourceCode } from '../hexagony/SourceCode';
import { arrayInitialize, countBytes, countCodepoints, countOperators, getHexagonSize, getRowCount, getRowSize, removeWhitespaceAndDebug } from '../hexagony/Util';

import { GridView, initializeGridColors } from '../view/GridView';
import { applyColorMode, assertDefined, assertNotNull, colorModes, darkColorMode, getControlKey } from '../view/ViewUtil';
import { clearLocationHash, generateLink, IHashData, IUserData, loadHashData, loadUserData, saveUserData } from '../view/UserData';

import { CodePanel } from './CodePanel';
import { HotkeysPanel } from './HotkeysPanel';
import { ImportExportPanel } from './ImportExportPanel';
import { IInfoPanelProps, InfoPanel } from './InfoPanel';
import { InputPanel, inputModeArguments } from './InputPanel';
import { MemoryPanel } from './MemoryPanel';
import { OutputPanel } from './OutputPanel';
import { IStatePanelProps, StatePanel } from './StatePanel';
import { NavigationLinks } from './NavigationLinks';
import { ViewControls } from './ViewControls';
import { EditControls } from './EditControls';
import { PlayControls } from './PlayControls';

const maxSpeedIterations = 10000;
const executionHistoryCount = 20;

export function updateAppHelper(element: HTMLElement): void {
    ReactDOM.render(<React.StrictMode><App/></React.StrictMode>, element);
}

function getAnimationDelay(value: number) {
    // Use a default value for high-speed mode, where delay is set to zero.
    return `${value || 250}ms`;
}

// Props aren't used for the App component. The type indicates an empty object.
type IAppProps = Record<string, never>;

interface IUndoItem {
    i: number | null;
    j: number | null;
    isSizeChange: boolean;
    oldCode: string;
    newCode: string;
}

interface IAppState {
    animationDelay: string;
    isGeneratedLinkUpToDate: boolean;
    isRunning: boolean;
    isUndoRedoInProgress: boolean;
    link: string;
    redoStack: IUndoItem[];
    selectedIp: number;
    sourceCode: ISourceCode;
    terminationReason: string | null;
    ticks: number;
    timeoutID: number | null;
    typingDirection: DirectionString;
    undoStack: IUndoItem[];
    userData: IUserData;
}

export class App extends React.Component<IAppProps, IAppState> {
    private hexagony: Hexagony | null = null;
    private gridViewReference: GridView | null = null;
    private executionHistory: [number, number, Direction][][] = [];
    private startingToPlay = false;

    constructor(props: IAppProps) {
        super(props);
        const userData = loadUserData();
        const state: IAppState = {
            userData,
            selectedIp: 0,
            link: '',
            isGeneratedLinkUpToDate: false,
            // isRunning indicates whether the view is in execution mode. This includes just after the program
            // terminates, so that the user can see its state.
            isRunning: false,
            isUndoRedoInProgress: false,
            animationDelay: getAnimationDelay(userData.delay),
            terminationReason: null,
            ticks: 0,
            timeoutID: null,
            typingDirection: east.toString(),
            undoStack: [],
            redoStack: [],
            sourceCode: SourceCode.fromString(userData.code).toObject(),
        };

        const hashData = loadHashData();
        if (hashData) {
            App.applyHashDataToState(state, hashData);
            // This is a new tab. Copy its state to sessionStorage so that it will be
            // independent of existing tabs.
            saveUserData(state.userData);
            clearLocationHash();
            state.sourceCode = SourceCode.fromString(state.userData.code).toObject();
        }

        this.state = state;
        this.updateColorMode();
    }

    private get gridView(): GridView {
        return assertNotNull(this.gridViewReference, 'gridViewReference');
    }

    private static canUndo(state: IAppState): boolean {
        const { isRunning, undoStack } = state;
        return undoStack.length !== 0 &&
            (!isRunning || !undoStack[undoStack.length - 1].isSizeChange);
    }

    private static canRedo(state: IAppState): boolean {
        const { isRunning, redoStack } = state;
        return redoStack.length !== 0 &&
            (!isRunning || !redoStack[redoStack.length - 1].isSizeChange);
    }

    /**
     * Update the state with immer to produce a new immutable state.
     * This wrapper provides better type annotations for TypeScript to avoid the need to annotate
     * each arrow function passed to this method.
     */
    private updateState(update: (state: IAppState) => void): void {
        this.setState(produce(update));
    }

    private updateCodeCallback = (i: number, j: number, char: string): void =>
        this.updateState(state => App.applyCodeChangeToState(state, char, i, j));

    private setSourceCode = (newCode: string): void =>
        this.updateState(state => App.applyCodeChangeToState(state, newCode));

    private applySourceCodeChange = (sourceCodeToNewCode: (sourceCode: SourceCode) => string): void =>
        this.updateState(state =>
            App.applyCodeChangeToState(state,
                sourceCodeToNewCode(SourceCode.fromObject(state.sourceCode))));

    private onLayoutCode = (): void =>
        this.applySourceCodeChange(sourceCode => sourceCode.layoutCode());

    private onMinifyCode = (): void =>
        this.applySourceCodeChange(sourceCode => sourceCode.minifyCode());

    private onBigger = (): void =>
        this.applySourceCodeChange(sourceCode => sourceCode.resizeCode(sourceCode.size + 1));

    private onReset = (): void =>
        this.applySourceCodeChange(sourceCode => sourceCode.resetCode());

    private onReverseMemoryMovement = (): void => {
        const { state } = this;
        const oldCode = SourceCode.fromObject(state.sourceCode).toString();
        const newCode = oldCode.replace(/\{|}|'|"/g, (match: string) => {
            switch (match) {
                case '{':
                    return '}';
                case '}':
                    return '{';
                case "'":
                    return '"';
                case '"':
                    return "'";
                default:
                    throw new Error('internal error');
            }
        });

        if (newCode === oldCode) {
            return;
        }

        // Can't use applySourceCodeChange, because side effects (the confirm dialog)
        // aren't compatible with produce.
        if (!newCode.match(/-|:|%|\^|&/) ||
            confirm('Reversing the direction of memory movement commands will change the functionality of this program.')) {
            this.updateState(state => App.applyCodeChangeToState(state, newCode));
        }
    };

    private onSmaller = (): void => {
        const { state } = this;
        const { size } = state.sourceCode;
        const newSize = Math.max(1, size - 1);
        // Can't use applySourceCodeChange, because side effects (the confirm dialog)
        // aren't compatible with produce.
        const newCode = SourceCode.fromObject(state.sourceCode).resizeCode(newSize);
        if (countOperators(this.state.userData.code) == countOperators(newCode) ||
            confirm('Shrink the hexagon? Code will be lost, but this can be undone.')) {
            this.updateState(state => App.applyCodeChangeToState(state, newCode));
        }
    };

    private onUndo = (): void =>
        this.updateState(state => {
            if (App.canUndo(state)) {
                const undoItem = assertDefined(state.undoStack.pop(), 'undoStack.pop');
                state.redoStack.push(undoItem);
                const { i, j, oldCode } = undoItem;
                state.isUndoRedoInProgress = true;
                try {
                    App.applyCodeChangeToState(state, oldCode, i, j);
                }
                finally {
                    state.isUndoRedoInProgress = false;
                }
            }
        });

    private onRedo = (): void =>
        this.updateState(state => {
            if (App.canRedo(state)) {
                const undoItem = assertDefined(state.redoStack.pop(), 'redoStack.pop');
                state.undoStack.push(undoItem);
                const { i, j, newCode } = undoItem;
                state.isUndoRedoInProgress = true;
                try {
                    App.applyCodeChangeToState(state, newCode, i, j);
                }
                finally {
                    state.isUndoRedoInProgress = false;
                }
            }
        });

    private static applyCodeChangeToState(
        state: IAppState,
        newCode: string,
        i: number | null = null,
        j: number | null = null): void {
        const { isUndoRedoInProgress, sourceCode, userData } = state;

        if (i !== null && j !== null) {
            // It's a one character change.
            const oldCode = sourceCode.grid[i][j];
            if (newCode === oldCode) {
                return;
            }
            state.isGeneratedLinkUpToDate = false;
            sourceCode.grid[i][j] = newCode;
            userData.code = SourceCode.fromObject(sourceCode).toString();

            if (!isUndoRedoInProgress) {
                state.undoStack.push({
                    i,
                    j,
                    newCode,
                    oldCode,
                    isSizeChange: false,
                });
                state.redoStack = [];
            }

            return;
        }

        // Replace all of the code.
        // It would be possible to detect single char changes.
        // They only happen through the import/export panel though, which is likely used
        // less than the main code panel for editing.
        const oldCode = userData.code;
        if (newCode === oldCode) {
            return;
        }
        state.isGeneratedLinkUpToDate = false;
        const newSourceCode = SourceCode.fromString(newCode).toObject();
        const newSize = newSourceCode.size;
        const oldSize = sourceCode.size;
        state.sourceCode = newSourceCode;
        userData.code = newCode;

        if (!isUndoRedoInProgress) {
            state.undoStack.push({
                i: null,
                j: null,
                newCode,
                oldCode,
                isSizeChange: newSize !== oldSize,
            });
            state.redoStack = [];
        }

        if (newSize < oldSize) {
            // Remove breakpoints that no longer fit.
            const newRowCount = getRowCount(newSize);
            userData.breakpoints = userData.breakpoints.filter(id => {
                const [i, j] = id.split(',').map(Number);
                return i < newRowCount && j < getRowSize(newSize, i);
            });
        }
    }

    private onInputChanged = (value: string): void =>
        this.updateState(state => {
            state.userData.input = value;
            state.isGeneratedLinkUpToDate = false;
        });

    private onInputModeChanged = (value: string): void =>
        this.updateState(state => {
            state.userData.inputMode = value;
            state.isGeneratedLinkUpToDate = false;
        });

    private onSpeedSliderChanged = (rawValue: number): void => {
        const value = Math.floor(10 ** -3 * (1000 - rawValue) ** 2);
        this.updateState(state => {
            state.userData.delay = value;
            state.animationDelay = getAnimationDelay(value);
        });
    };

    private breakpointExistsAt(i: number, j: number): boolean {
        const id = `${i},${j}`;
        return this.state.userData.breakpoints.indexOf(id) > -1;
    }

    private * getBreakpoints(): Generator<number[]> {
        for (const id of this.state.userData.breakpoints) {
            yield id.split(',').map(Number);
        }
    }

    private onDeleteBreakpoints = (): void => {
        for (const [i, j] of this.getBreakpoints()) {
            this.gridView.setBreakpointState(i, j, false);
        }

        this.updateState(state => { state.userData.breakpoints = []; });
    };

    private toggleBreakpointCallback = (i: number, j: number): void => {
        const id = `${i},${j}`;

        this.updateState(state => {
            const index = state.userData.breakpoints.indexOf(id);
            if (index > -1) {
                state.userData.breakpoints.splice(index, 1);
                this.gridView.setBreakpointState(i, j, false);
            }
            else {
                state.userData.breakpoints.push(id);
                this.gridView.setBreakpointState(i, j, true);
            }
        });
    };

    private static applyHashDataToState(state: IAppState, hashData: IHashData): void {
        state.userData.code = hashData.code;

        if (hashData.inputMode) {
            state.userData.inputMode = hashData.inputMode;
        }

        if (hashData.input) {
            state.userData.input = hashData.input;
        }

        state.link = hashData.link;
        state.isGeneratedLinkUpToDate = true;
    }

    private loadDataFromURL = (): void => {
        const hashData = loadHashData();
        if (hashData) {
            // Stop execution first, as the hexagon size may change.
            this.onStop();
            this.updateState(state => {
                App.applyCodeChangeToState(state, hashData.code);
                App.applyHashDataToState(state, hashData);
            });
            clearLocationHash();
        }
    };

    private onGenerateLink = (): string => {
        const { userData } = this.state;
        const link = generateLink(userData.code, userData.input, userData.inputMode);
        this.updateState(state => {
            state.isGeneratedLinkUpToDate = true;
            state.link = link;
        });
        return link;
    };

    private onGenerateAndCopyLink = (): Promise<void> =>
        navigator.clipboard.writeText(this.onGenerateLink());

    private onPlayPause = (): void => {
        if (this.isPlaying()) {
            this.onPause();
        }
        else {
            this.onStart();
        }
    };

    private onStart = (): void => this.stepHelper(true);

    private onStep = (): void => {
        this.stepHelper();
        this.onPause();
    };

    private static getInput(state: IAppState): string {
        const { userData } = state;
        let { input } = userData;
        if (userData.inputMode === inputModeArguments) {
            input = input.replace(/\n/g, '\0');
        }
        return input;
    }

    private edgeEventHandler = (edgeName: string, isBranch: boolean): void => {
        // Don't show edge transition animations when running at high speed.
        const { userData } = this.state;
        if (userData.delay || !this.isPlaying()) {
            this.gridView.playEdgeAnimation(edgeName, isBranch);
        }
    };

    private stepHelper(play = false): void {
        if (this.isTerminated()) {
            return;
        }

        const { sourceCode, userData } = this.state;

        if (this.hexagony === null) {
            const hexagony = new Hexagony(sourceCode, App.getInput(this.state), this.edgeEventHandler);
            this.hexagony = hexagony;
            hexagony.setFirstStepNoop();
            this.executionHistory = arrayInitialize(6, index => {
                const [coords, dir] = hexagony.getIPState(index);
                const [i, j] = hexagony.axialToIndex(coords);
                return [[i, j, dir]];
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).totalTime = 0;
        }

        if (play) {
            this.startingToPlay = true;
        }

        const { hexagony } = this;
        let breakpoint = false;

        let maximumSteps = 1;
        if (play && userData.delay === 0) {
            // Move one extra step, if execution hasn't started yet.
            maximumSteps = maxSpeedIterations + Number(!hexagony.ticks);
        }

        let stepCount = 0;

        const p1 = performance.now();

        while (stepCount < maximumSteps && !breakpoint && !this.isTerminated()) {
            stepCount++;
            hexagony.step();
            const { activeIp, coords, dir } = hexagony;
            const [i, j] = hexagony.axialToIndex(coords);

            // The active coordinates don't change when the program terminates.
            if (!this.isTerminated()) {
                const previous = this.executionHistory[activeIp];
                if (i !== previous[0][0] || j !== previous[0][1] || dir !== previous[0][2]) {
                    this.executionHistory[activeIp] = [[i, j, dir], ...previous.slice(0, executionHistoryCount)];
                }
            }

            if (this.breakpointExistsAt(i, j)) {
                breakpoint = true;
            }
        }

        const p2 = performance.now();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).totalTime += p2 - p1;

        const selectedIp = hexagony.activeIp;
        const forceUpdateExecutionState = stepCount > 1;
        this.gridView.updateActiveCell(this.executionHistory, selectedIp, hexagony.getExecutedGrid(), false, forceUpdateExecutionState);
        this.startingToPlay = false;

        const timeoutID = play && !breakpoint && !this.isTerminated() ?
            window.setTimeout(this.onStart, userData.delay) :
            null;

        this.updateState(state => {
            state.isRunning = true;
            state.selectedIp = selectedIp;
            state.terminationReason = hexagony.getTerminationReason() ?? (breakpoint ? 'Stopped at breakpoint.' : null);
            state.ticks = hexagony.ticks;
            state.timeoutID = timeoutID;
            // Synchronize typing direction with execution direction.
            state.typingDirection = hexagony.dir.toString();
        });
    }

    private getInfoPanelProps(): IInfoPanelProps {
        const { userData } = this.state;
        const filteredCode = removeWhitespaceAndDebug(userData.code);
        const filteredCodepoints = countCodepoints(filteredCode);
        return {
            breakpoints: userData.breakpoints.length,
            size: getHexagonSize(filteredCodepoints),
            chars: countCodepoints(userData.code),
            bytes: countBytes(userData.code),
            operators: countOperators(filteredCode)
        };
    }

    private getStatePanelProps(): IStatePanelProps {
        const hexagony = assertNotNull(this.hexagony, 'hexagony');
        const { terminationReason, userData, selectedIp } = this.state;

        return {
            colorMode: userData.colorMode,
            colorOffset: userData.colorOffset,
            cycleColorOffset: this.cycleColorOffset,
            terminationReason,
            ipStates: arrayInitialize(6, i => {
                const [coords, dir] = hexagony.getIPState(i);
                return {
                    coords,
                    dir,
                    active: hexagony.activeIp === i,
                    selected: selectedIp === i,
                    number: i,
                };
            }),
            ticks: hexagony.ticks,
            memoryPointer: hexagony.memory.mp,
            memoryDir: hexagony.memory.dir,
            memoryCw: hexagony.memory.cw,
            memoryEdges: hexagony.memory.getMemoryEdges(),
            info: this.getInfoPanelProps(),
            onSelectedIPChanged: this.onSelectedIPChanged,
        };
    }

    private onPause = (): void => this.updateState(state => App.pause(state));

    private static pause(state: IAppState): void {
        const { timeoutID } = state;
        if (timeoutID !== null) {
            window.clearTimeout(timeoutID);
            state.timeoutID = null;
        }
    }

    private onStop = (): void => {
        this.hexagony = null;
        this.executionHistory = [];
        this.gridView.clearCellExecutionColors();
        this.updateState(state => {
            App.pause(state);
            state.ticks = 0;
            state.isRunning = false;
            state.typingDirection = east.toString();
        });
    };

    private resetCellColors(): void {
        if (this.hexagony != null) {
            const { selectedIp } = this.state;
            this.gridView.updateActiveCell(this.executionHistory, selectedIp, this.hexagony.getExecutedGrid(), true, false);
        }
    }

    private onSelectedIPChanged = (ip: number): void =>
        this.updateState(state => { state.selectedIp = ip; });

    private isPlaying = (): boolean =>
        this.startingToPlay || this.state.timeoutID !== null;

    private isTerminated = (): boolean =>
        this.hexagony != null && this.hexagony.getTerminationReason() != null;

    private onKeyDown = (e: KeyboardEvent): void => {
        if (getControlKey(e)) {
            if (e.key === '.') {
                this.onStep();
                e.preventDefault();
            }
            else if (e.key === 'Enter') {
                if (e.shiftKey) {
                    this.onStop();
                }
                else {
                    this.onPlayPause();
                }
                e.preventDefault();
            }
            else if (e.key === 'z' && !e.shiftKey) {
                if ((e.target as Element).id !== 'inputBox') {
                    this.onUndo();
                    e.preventDefault();
                }
            }
            else if (e.key === 'y' || e.key === 'z' && e.shiftKey) {
                if ((e.target as Element).id !== 'inputBox') {
                    this.onRedo();
                    e.preventDefault();
                }
            }
        }
    };

    private updateColorMode(): void {
        const { userData } = this.state;
        applyColorMode(this.state.userData.colorMode);
        initializeGridColors(userData.colorMode, userData.colorOffset);
    }

    private onColorPropertyChanged(): void {
        this.updateColorMode();
        // It's easier to recreate the grid than to update all color-related class names.
        this.gridView.recreateGrid(this.hexagony ? this.hexagony.getExecutedGrid() : null);
        this.gridView.setBreakpoints(this.getBreakpoints());
    }

    private onEdgeTransitionModeChanged(): void {
        const { userData } = this.state;
        this.gridView.edgeTransitionMode = userData.edgeTransitionMode;
        this.gridView.recreateGrid(this.hexagony ? this.hexagony.getExecutedGrid() : null);
        this.gridView.setBreakpoints(this.getBreakpoints());
    }

    private toggleEdgeTransitionMode = (): void =>
        this.updateState(state => { state.userData.edgeTransitionMode = !state.userData.edgeTransitionMode; });

    private toggleArrows = (): void =>
        this.updateState(state => { state.userData.showArrows = !state.userData.showArrows; });

    private toggleDirectionalTyping = (): void =>
        this.updateState(state => { state.userData.directionalTyping = !state.userData.directionalTyping; });

    private toggleIPs = (): void =>
        this.updateState(state => { state.userData.showIPs = !state.userData.showIPs; });

    private toggleDarkMode = (): void =>
        this.updateState(state => { state.userData.colorMode = colorModes[1 - colorModes.indexOf(state.userData.colorMode)]; });

    private cycleColorOffset = (): void =>
        this.updateState(state => { state.userData.colorOffset = (state.userData.colorOffset + 1) % 6; });

    private onUtf8OutputChanged = (value: boolean): void =>
        this.updateState(state => { state.userData.utf8Output = value; });

    private onTypingDirectionChanged = (value: Direction): void =>
        this.updateState((state: IAppState) => { state.typingDirection = value.toString(); });

    componentDidMount(): void {
        const { animationDelay, sourceCode, typingDirection, userData } = this.state;

        const gridView = new GridView(this.updateCodeCallback, this.toggleBreakpointCallback,
            this.onTypingDirectionChanged, sourceCode, animationDelay);
        this.gridViewReference = gridView;
        gridView.edgeTransitionMode = userData.edgeTransitionMode;
        gridView.setDirectionalTyping(userData.directionalTyping);
        gridView.setShowArrows(userData.showArrows);
        gridView.setShowIPs(userData.showIPs);
        gridView.setSourceCode(sourceCode);
        gridView.setBreakpoints(this.getBreakpoints());
        gridView.setTypingDirection(Direction.fromString(typingDirection));

        document.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('hashchange', this.loadDataFromURL);
    }

    componentWillUnmount(): void {
        document.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('hashchange', this.loadDataFromURL);
    }

    componentDidUpdate(prevProps: IAppProps, prevState: IAppState): void {
        const { gridView, state } = this;
        const { animationDelay, selectedIp, sourceCode, typingDirection, userData } = state;
        const prevUserData = prevState.userData;
        const prevSourceCode = prevState.sourceCode;

        if (userData !== prevUserData) {
            if (prevState) {
                saveUserData(userData);
            }

            if (userData.code !== prevUserData.code) {
                if (this.hexagony !== null) {
                    // The code should be the same size hexagon.
                    // When running, undo/redo is disabled for different size hexagons,
                    // the resize buttons are disabled, and the import/export panel is hidden.
                    this.hexagony.setSourceCode(sourceCode);
                }

                gridView.setSourceCode(sourceCode);
                if (sourceCode.size !== prevSourceCode.size) {
                    // Replace breakpoints, because the grid has been recreated.
                    gridView.setBreakpoints(this.getBreakpoints());
                }
            }

            if (userData.colorMode !== prevUserData.colorMode ||
                userData.colorOffset !== prevUserData.colorOffset) {
                this.onColorPropertyChanged();
            }

            if (userData.directionalTyping !== prevUserData.directionalTyping) {
                gridView.setDirectionalTyping(userData.directionalTyping);
            }

            if (userData.showIPs !== prevUserData.showIPs) {
                gridView.setShowIPs(userData.showIPs);
            }

            if (userData.showArrows !== prevUserData.showArrows) {
                gridView.setShowArrows(userData.showArrows);
                this.resetCellColors();
            }

            if (userData.edgeTransitionMode !== prevUserData.edgeTransitionMode) {
                this.onEdgeTransitionModeChanged();
            }
            else if (userData.breakpoints !== prevUserData.breakpoints) {
                gridView.setBreakpoints(this.getBreakpoints());
            }

            if (this.hexagony !== null &&
                (userData.input !== prevUserData.input ||
                userData.inputMode !== prevUserData.inputMode)) {
                this.hexagony.setInput(App.getInput(state));
            }
        }

        if (selectedIp !== prevState.selectedIp) {
            this.resetCellColors();
        }

        if (typingDirection !== prevState.typingDirection) {
            gridView.setTypingDirection(Direction.fromString(typingDirection));
        }

        if (animationDelay !== prevState.animationDelay) {
            gridView.setDelay(animationDelay);
        }
    }

    render(): JSX.Element {
        const { animationDelay, link, isGeneratedLinkUpToDate, isRunning, typingDirection, userData } = this.state;
        const { hexagony } = this;

        const mainContent = hexagony !== null ?
            <>
                <OutputPanel
                    outputBytes={hexagony.output}
                    utf8Output={this.state.userData.utf8Output}
                    onUtf8OutputChanged={this.onUtf8OutputChanged}/>
                <MemoryPanel
                    delay={animationDelay}
                    isPlayingAtHighSpeed={this.isPlaying() && userData.delay === 0}
                    memory={hexagony.memory}/>
                <StatePanel {...this.getStatePanelProps()}/>
            </> :
            <>
                <InfoPanel {...this.getInfoPanelProps()}/>
                <ImportExportPanel
                    isGeneratedLinkUpToDate={isGeneratedLinkUpToDate}
                    link={link}
                    sourceCode={userData.code}
                    onGenerateLink={this.onGenerateLink}
                    onGenerateAndCopyLink={this.onGenerateAndCopyLink}
                    onImportSourceCode={this.setSourceCode}
                    onLayoutCode={this.onLayoutCode}
                    onMinifyCode={this.onMinifyCode}/>
                <HotkeysPanel
                    directionalTyping={userData.directionalTyping}/>
            </>;

        return (
            <>
                <div id="appGrid" className={hexagony ? 'playGrid' : 'editGrid'}>
                    <header>
                        <nav>
                            <NavigationLinks/>
                            <ViewControls
                                edgeTransitionModeEnabled={userData.edgeTransitionMode}
                                arrowsEnabled={userData.showArrows}
                                ipsEnabled={userData.showIPs}
                                darkModeEnabled={userData.colorMode === darkColorMode}
                                toggleEdgeTransitionMode={this.toggleEdgeTransitionMode}
                                toggleArrows={this.toggleArrows}
                                toggleIPs={this.toggleIPs}
                                toggleDarkMode={this.toggleDarkMode}/>
                            <EditControls
                                canDeleteBreakpoints={userData.breakpoints.length !== 0}
                                canEdit={!isRunning}
                                canRedo={App.canRedo(this.state)}
                                canUndo={App.canUndo(this.state)}
                                directionalTyping={userData.directionalTyping}
                                onBigger={this.onBigger}
                                onDeleteBreakpoints={this.onDeleteBreakpoints}
                                onRedo={this.onRedo}
                                onReset={this.onReset}
                                onReverseMemoryMovement={this.onReverseMemoryMovement}
                                onSmaller={this.onSmaller}
                                onTypingDirectionChanged={this.onTypingDirectionChanged}
                                onUndo={this.onUndo}
                                toggleDirectionalTyping={this.toggleDirectionalTyping}
                                typingDirection={Direction.fromString(typingDirection)}/>
                            <PlayControls
                                canPlayPause={!this.isTerminated()}
                                canStep={!this.isTerminated() && !this.isPlaying()}
                                canStop={isRunning}
                                delay={userData.delay}
                                isPlaying={this.isPlaying()}
                                onPlayPause={this.onPlayPause}
                                onSpeedSliderChanged={this.onSpeedSliderChanged}
                                onStep={this.onStep}
                                onStop={this.onStop}/>
                        </nav>
                    </header>
                    <CodePanel/>
                    <InputPanel
                        input={userData.input}
                        inputMode={userData.inputMode}
                        onInputChanged={this.onInputChanged}
                        onInputModeChanged={this.onInputModeChanged}/>
                    {mainContent}
                </div>
            </>
        );
    }
}
