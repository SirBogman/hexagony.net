import React from 'react';
import ReactDOM from 'react-dom';
import { produce } from 'immer';
import LZString from 'lz-string';

import { Direction } from '../hexagony/Direction';
import { Hexagony } from '../hexagony/Hexagony';
import { ISourceCode, SourceCode } from '../hexagony/SourceCode';
import { arrayInitialize, countBytes, countCodepoints, countOperators, getHexagonSize, getRowCount, getRowSize, removeWhitespaceAndDebug } from '../hexagony/Util';
import { GridView, initializeGridColors } from '../view/GridView';
import { applyColorMode, assertNotNull, colorModes, darkColorMode, getControlKey, parseStorage, prefersDarkColorScheme } from '../view/ViewUtil';

import { CodePanel } from './CodePanel';
import { HotkeysPanel } from './HotkeysPanel';
import { ImportExportPanel } from './ImportExportPanel';
import { IInfoPanelProps, InfoPanel } from './InfoPanel';
import { InputPanel, inputModeArguments, isValidInputMode } from './InputPanel';
import { MemoryPanel } from './MemoryPanel';
import { OutputPanel } from './OutputPanel';
import { IStatePanelProps, StatePanel } from './StatePanel';
import { NavigationLinks } from './NavigationLinks';
import { ViewControls } from './ViewControls';
import { EditControls } from './EditControls';
import { PlayControls } from './PlayControls';

const fibonacciExample = ')="/}.!+/M8;';
const helloWorldExample = 'H;e;/;o;W@>r;l;l;;o;Q\\;0P;2<d;P1;';
const maxSpeedIterations = 10000;
const executionHistoryCount = 20;

export function updateAppHelper(element: HTMLElement): void {
    ReactDOM.render(<React.StrictMode><App/></React.StrictMode>, element);
}

function getAnimationDelay(value: number) {
    // Use a default value for high-speed mode, where delay is set to zero.
    return `${value || 250}ms`;
}

interface IHashData {
    code: string;
    link: string;
    input: string | undefined;
    inputMode: string | undefined;
}

function loadHashData() : IHashData | null {
    const link = location.href;

    if (location.hash.startsWith('#lz')) {
        try {
            if (location.hash) {
                const decompressed = LZString.decompressFromBase64(location.hash.slice(3));
                const data = JSON.parse(assertNotNull(decompressed, 'decompressed'));
                if (data && data.code) {
                    return {
                        code: data.code,
                        inputMode: data.inputMode,
                        input: data.input,
                        link,
                    };
                }
            }
        }
        // eslint-disable-next-line no-empty
        catch (e) {
        }
    }
    else if (location.hash === '#fibonacci') {
        return {
            code: fibonacciExample,
            input: undefined,
            inputMode: undefined,
            link,
        };
    }
    else if (location.hash === '#helloworld') {
        return {
            code: SourceCode.fromString(helloWorldExample).layoutCode(),
            input: undefined,
            inputMode: undefined,
            link,
        };
    }

    return null;
}

function sanitizeBool(value: unknown, defaultValue: boolean): boolean {
    return typeof value === 'boolean' ? value : defaultValue;
}

function loadUserData() : IUserData {
    let userData = parseStorage(sessionStorage.userData);

    if (!userData?.code) {
        userData = parseStorage(localStorage.userData);
        // This is a new tab. Copy its state to sessionStorage so that it will be
        // independent of existing tabs.
        sessionStorage.userData = localStorage.userData;
    }

    if (!userData?.code || typeof userData.code !== 'string') {
        userData = { code: SourceCode.fromString(helloWorldExample).layoutCode() };
    }

    const defaultColorMode = colorModes[Number(prefersDarkColorScheme())];
    return {
        code: userData.code,
        delay: userData.delay ?? 250,
        directionalTyping: sanitizeBool(userData.directionalTyping, false),
        breakpoints: userData.breakpoints ?? [],
        colorMode: colorModes.includes(userData.colorMode) ? userData.colorMode : defaultColorMode,
        colorOffset: userData.colorOffset ?? 0,
        input: userData.input ?? '',
        inputMode: isValidInputMode(userData.inputMode) ? userData.inputMode : inputModeArguments,
        utf8Output: sanitizeBool(userData.utf8Output, true),
        edgeTransitionMode: sanitizeBool(userData.edgeTransitionMode, true),
        showArrows: sanitizeBool(userData.showArrows, false),
        showIPs: sanitizeBool(userData.showIPs, false),
    };
}

function clearLocationHash() {
    // After consuming the hash, move the URL to the export box and remove it from the location.
    // Otherwise, changes in localStorage would be overwritten when reloading the page.
    // For some reason, calling replaceState while in the constructor of a React component
    // can cause the page to reload, so delay it until the next event cycle.
    window.setTimeout(() => history.replaceState(null, '', '/'));
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

interface IUserData {
    breakpoints: string[];
    code: string;
    colorMode: string;
    colorOffset: number;
    delay: number;
    directionalTyping: boolean;
    edgeTransitionMode: boolean;
    input: string;
    inputMode: string; // TODO: enum?
    showArrows: boolean;
    showIPs: boolean;
    utf8Output: boolean;
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
    undoStack: IUndoItem[];
    userData: IUserData;
}

export class App extends React.Component<IAppProps, IAppState> {
    hexagony: Hexagony | null;
    gridViewReference: GridView | null;
    executionHistory: [number, number, Direction][][];
    startingToPlay: boolean;

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
            undoStack: [],
            redoStack: [],
            sourceCode: SourceCode.fromString(userData.code).toObject(),
        };

        const hashData = loadHashData();
        if (hashData) {
            App.applyHashDataToState(state, hashData);
            // This is a new tab. Copy its state to sessionStorage so that it will be
            // independent of existing tabs.
            App.saveUserData(state.userData);
            clearLocationHash();
            state.sourceCode = SourceCode.fromString(state.userData.code).toObject();
        }

        this.state = state;
        this.hexagony = null;
        this.gridViewReference = null;
        this.executionHistory = [];
        this.startingToPlay = false;

        this.updateColorMode();
    }

    get gridView(): GridView {
        return assertNotNull(this.gridViewReference, 'gridViewReference');
    }

    static saveUserData(userData: IUserData): void {
        const serializedData = JSON.stringify(userData);
        sessionStorage.userData = serializedData;
        localStorage.userData = serializedData;
    }

    static canUndo(state: IAppState): boolean {
        const { isRunning, undoStack } = state;
        return undoStack.length !== 0 &&
            (!isRunning || !undoStack[undoStack.length - 1].isSizeChange);
    }

    static canRedo(state: IAppState): boolean {
        const { isRunning, redoStack } = state;
        return redoStack.length !== 0 &&
            (!isRunning || !redoStack[redoStack.length - 1].isSizeChange);
    }

    updateCodeCallback = (i: number, j: number, char: string): void =>
        this.setState(produce(state => App.applyCodeChangeToState(state, char, i, j)));

    setSourceCode = (newCode: string): void =>
        this.setState(produce(state => App.applyCodeChangeToState(state, newCode)));

    applySourceCodeChange = (sourceCodeToNewCode: (sourceCode: SourceCode) => string): void =>
        this.setState(produce(state =>
            App.applyCodeChangeToState(state,
                sourceCodeToNewCode(SourceCode.fromObject(state.sourceCode)))));

    onLayoutCode = (): void =>
        this.applySourceCodeChange(sourceCode => sourceCode.layoutCode());

    onMinifyCode = (): void =>
        this.applySourceCodeChange(sourceCode => sourceCode.minifyCode());

    onBigger = (): void =>
        this.applySourceCodeChange(sourceCode => sourceCode.resizeCode(sourceCode.size + 1));

    onReset = (): void =>
        this.applySourceCodeChange(sourceCode => sourceCode.resetCode());

    onReverseMemoryMovement = (): void => {
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
            this.setState(produce(state => App.applyCodeChangeToState(state, newCode)));
        }
    };

    onSmaller = (): void => {
        const { state } = this;
        const { size } = state.sourceCode;
        const newSize = Math.max(1, size - 1);
        // Can't use applySourceCodeChange, because side effects (the confirm dialog)
        // aren't compatible with produce.
        const newCode = SourceCode.fromObject(state.sourceCode).resizeCode(newSize);
        if (countOperators(this.state.userData.code) == countOperators(newCode) ||
            confirm('Shrink the hexagon? Code will be lost, but this can be undone.')) {
            this.setState(produce(state => App.applyCodeChangeToState(state, newCode)));
        }
    };

    onUndo = (): void =>
        this.setState(produce(state => {
            if (App.canUndo(state)) {
                const undoItem = state.undoStack.pop();
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
        }));

    onRedo = (): void =>
        this.setState(produce(state => {
            if (App.canRedo(state)) {
                const undoItem = state.redoStack.pop();
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
        }));

    static applyCodeChangeToState(
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

    onInputChanged = (value: string): void =>
        this.setState(produce(state => {
            state.userData.input = value;
            state.isGeneratedLinkUpToDate = false;
        }));

    onInputModeChanged = (value: string): void =>
        this.setState(produce(state => {
            state.userData.inputMode = value;
            state.isGeneratedLinkUpToDate = false;
        }));

    onSpeedSliderChanged = (rawValue: number): void => {
        const value = Math.floor(10 ** -3 * (1000 - rawValue) ** 2);
        this.setState(produce(state => {
            state.userData.delay = value;
            state.animationDelay = getAnimationDelay(value);
        }));
    };

    breakpointExistsAt(i: number, j: number): boolean {
        const id = `${i},${j}`;
        return this.state.userData.breakpoints.indexOf(id) > -1;
    }

    * getBreakpoints(): Generator<number[]> {
        for (const id of this.state.userData.breakpoints) {
            yield id.split(',').map(Number);
        }
    }

    onDeleteBreakpoints = (): void => {
        for (const [i, j] of this.getBreakpoints()) {
            this.gridView.setBreakpointState(i, j, false);
        }

        this.setState(produce(state => { state.userData.breakpoints = []; }));
    };

    toggleBreakpointCallback = (i: number, j: number): void => {
        const id = `${i},${j}`;

        this.setState(produce(state => {
            const index = state.userData.breakpoints.indexOf(id);
            if (index > -1) {
                state.userData.breakpoints.splice(index, 1);
                this.gridView.setBreakpointState(i, j, false);
            }
            else {
                state.userData.breakpoints.push(id);
                this.gridView.setBreakpointState(i, j, true);
            }
        }));
    };

    static applyHashDataToState(state: IAppState, hashData: IHashData): void {
        state.userData.code = hashData.code;

        if (hashData.inputMode && isValidInputMode(hashData.inputMode)) {
            state.userData.inputMode = hashData.inputMode;
        }

        if (hashData.input) {
            state.userData.input = hashData.input;
        }

        state.link = hashData.link;
        state.isGeneratedLinkUpToDate = true;
    }

    loadDataFromURL = (): void => {
        const hashData = loadHashData();
        if (hashData) {
            // Stop execution first, as the hexagon size may change.
            this.onStop();
            this.setState(produce(state => {
                App.applyCodeChangeToState(state, hashData.code);
                App.applyHashDataToState(state, hashData);
            }));
            clearLocationHash();
        }
    };

    onGenerateLink = (): string => {
        const { userData } = this.state;
        const urlData = { code: userData.code, input: userData.input, inputMode: userData.inputMode };
        const json = JSON.stringify(urlData);
        const link = `${location.origin}/#lz${LZString.compressToBase64(json)}`;
        this.setState(produce(state => {
            state.isGeneratedLinkUpToDate = true;
            state.link = link;
        }));
        return link;
    };

    onGenerateAndCopyLink = (): Promise<void> =>
        navigator.clipboard.writeText(this.onGenerateLink());

    onPlayPause = (): void => {
        if (this.isPlaying()) {
            this.onPause();
        }
        else {
            this.onStart();
        }
    };

    onStart = (): void => this.stepHelper(true);

    onStep = (): void => {
        this.stepHelper();
        this.onPause();
    };

    static getInput(state: IAppState): string {
        const { userData } = state;
        let { input } = userData;
        if (userData.inputMode === inputModeArguments) {
            input = input.replace(/\n/g, '\0');
        }
        return input;
    }

    edgeEventHandler = (edgeName: string, isBranch: boolean): void => {
        // Don't show edge transition animations when running at high speed.
        const { userData } = this.state;
        if (userData.delay || !this.isPlaying()) {
            this.gridView.playEdgeAnimation(edgeName, isBranch);
        }
    };

    stepHelper(play = false): void {
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

        this.setState({
            isRunning: true,
            selectedIp,
            terminationReason: hexagony.getTerminationReason() ?? (breakpoint ? 'Stopped at breakpoint.' : null),
            ticks: hexagony.ticks,
            timeoutID,
        });
    }

    getInfoPanelProps(): IInfoPanelProps {
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

    getStatePanelProps(): IStatePanelProps {
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
            memoryEdges: Object.keys(hexagony.memory.data).length,
            info: this.getInfoPanelProps(),
            onSelectedIPChanged: this.onSelectedIPChanged,
        };
    }

    onPause = (): void => this.setState(produce(state => App.pause(state)));

    static pause(state: IAppState): void {
        const { timeoutID } = state;
        if (timeoutID !== null) {
            window.clearTimeout(timeoutID);
            state.timeoutID = null;
        }
    }

    onStop = (): void => {
        this.hexagony = null;
        this.executionHistory = [];
        this.gridView.clearCellExecutionColors();
        this.setState(produce(state => {
            App.pause(state);
            state.ticks = 0;
            state.isRunning = false;
        }));
    };

    resetCellColors(): void {
        if (this.hexagony != null) {
            const { selectedIp } = this.state;
            this.gridView.updateActiveCell(this.executionHistory, selectedIp, this.hexagony.getExecutedGrid(), true, false);
        }
    }

    onSelectedIPChanged = (ip: number): void =>
        this.setState({ selectedIp: ip });

    isPlaying(): boolean {
        return this.startingToPlay || this.state.timeoutID !== null;
    }

    isTerminated(): boolean {
        return this.hexagony != null && this.hexagony.getTerminationReason() != null;
    }

    onKeyDown = (e: KeyboardEvent): void => {
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

    updateColorMode(): void {
        const { userData } = this.state;
        applyColorMode(this.state.userData.colorMode);
        initializeGridColors(userData.colorMode, userData.colorOffset);
    }

    onColorPropertyChanged(): void {
        this.updateColorMode();
        // It's easier to recreate the grid than to update all color-related class names.
        this.gridView.recreateGrid(this.hexagony ? this.hexagony.getExecutedGrid() : null);
        this.gridView.setBreakpoints(this.getBreakpoints());
    }

    onEdgeTransitionModeChanged(): void {
        const { userData } = this.state;
        this.gridView.edgeTransitionMode = userData.edgeTransitionMode;
        this.gridView.recreateGrid(this.hexagony ? this.hexagony.getExecutedGrid() : null);
        this.gridView.setBreakpoints(this.getBreakpoints());
    }

    toggleEdgeTransitionMode = (): void =>
        this.setState(produce(state => { state.userData.edgeTransitionMode = !state.userData.edgeTransitionMode; }));

    toggleArrows = (): void =>
        this.setState(produce(state => { state.userData.showArrows = !state.userData.showArrows; }));

    toggleDirectionalTyping = (): void =>
        this.setState(produce(state => { state.userData.directionalTyping = !state.userData.directionalTyping; }));

    toggleIPs = (): void =>
        this.setState(produce(state => { state.userData.showIPs = !state.userData.showIPs; }));

    toggleDarkMode = (): void =>
        this.setState(produce(state => { state.userData.colorMode = colorModes[1 - colorModes.indexOf(state.userData.colorMode)]; }));

    cycleColorOffset = (): void =>
        this.setState(produce(state => { state.userData.colorOffset = (state.userData.colorOffset + 1) % 6; }));

    onUtf8OutputChanged = (value: boolean): void =>
        this.setState(produce(state => { state.userData.utf8Output = value; }));

    componentDidMount(): void {
        const { animationDelay, sourceCode, userData } = this.state;

        const gridView = new GridView(this.updateCodeCallback, this.toggleBreakpointCallback, sourceCode, animationDelay);
        this.gridViewReference = gridView;
        gridView.edgeTransitionMode = userData.edgeTransitionMode;
        gridView.setDirectionalTyping(userData.directionalTyping);
        gridView.setShowArrows(userData.showArrows);
        gridView.setShowIPs(userData.showIPs);
        gridView.setSourceCode(sourceCode);
        gridView.setBreakpoints(this.getBreakpoints());

        document.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('hashchange', this.loadDataFromURL);
    }

    componentWillUnmount(): void {
        document.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('hashchange', this.loadDataFromURL);
    }

    componentDidUpdate(prevProps: IAppProps, prevState: IAppState): void {
        const { gridView, state } = this;
        const { animationDelay, selectedIp, sourceCode, userData } = state;
        const prevUserData = prevState.userData;
        const prevSourceCode = prevState.sourceCode;

        if (userData !== prevUserData) {
            if (prevState) {
                App.saveUserData(userData);
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

        if (animationDelay !== prevState.animationDelay) {
            gridView.setDelay(animationDelay);
        }
    }

    render(): JSX.Element {
        const { animationDelay, link, isGeneratedLinkUpToDate, isRunning, userData } = this.state;
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
                                onUndo={this.onUndo}
                                toggleDirectionalTyping={this.toggleDirectionalTyping}/>
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
