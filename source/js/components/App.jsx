import React from 'react';
import ReactDOM from 'react-dom';
import { produce } from 'immer';
import LZString from 'lz-string';

import { Hexagony } from '../hexagony/hexagony.mjs';
import { arrayInitialize, countBytes, countCodepoints, countOperators, getHexagonSize, getRowCount, getRowSize, removeWhitespaceAndDebug } from '../hexagony/util.mjs';
import { GridView, initializeGridColors } from '../view/gridview.mjs';
import { applyColorMode, colorModes, darkColorMode, getControlKey, prefersDarkColorScheme } from '../view/viewutil.mjs';
import { SourceCode } from '../view/SourceCode.mjs';

import { CodePanel } from './CodePanel.jsx';
import { HotkeysPanel } from './HotkeysPanel.jsx';
import { ImportExportPanel } from './ImportExportPanel.jsx';
import { InfoPanel } from './InfoPanel.jsx';
import { InputPanel, inputModeArguments, isValidInputMode } from './InputPanel.jsx';
import { MemoryPanel } from './MemoryPanel.jsx';
import { OutputPanel } from './OutputPanel.jsx';
import { StatePanel } from './StatePanel.jsx';
import { NavigationLinks } from './NavigationLinks.jsx';
import { ViewControls } from './ViewControls.jsx';
import { EditControls } from './EditControls.jsx';
import { PlayControls } from './PlayControls.jsx';

const fibonacciExample = ')="/}.!+/M8;';
const helloWorldExample = 'H;e;/;o;W@>r;l;l;;o;Q\\;0P;2<d;P1;';
const maxSpeedIterations = 10000;
const executionHistoryCount = 20;

export function updateAppHelper(element) {
    ReactDOM.render(<React.StrictMode><App/></React.StrictMode>, element);
}

function getAnimationDelay(value) {
    // Use a default value for high-speed mode, where delay is set to zero.
    return `${value || 250}ms`;
}

function parseStorage(storage) {
    try {
        return JSON.parse(storage);
    }
    catch {
        return null;
    }
}

function loadHashData() {
    let hashData = null;

    if (location.hash.startsWith('#lz')) {
        try {
            if (location.hash) {
                hashData = JSON.parse(LZString.decompressFromBase64(location.hash.slice(3)));
            }
        }
        // eslint-disable-next-line no-empty
        catch (e) {
        }
    }
    else if (location.hash === '#fibonacci') {
        hashData = { code: fibonacciExample };
    }
    else if (location.hash === '#helloworld') {
        hashData = { code: SourceCode.fromString(helloWorldExample).layoutCode() };
    }

    if (hashData !== null) {
        hashData.link = location.href;
    }

    return hashData;
}

function loadUserData() {
    let userData = parseStorage(sessionStorage.userData);

    if (!userData?.code) {
        userData = parseStorage(localStorage.userData);
        // This is a new tab. Copy its state to sessionStorage so that it will be
        // independent of existing tabs.
        sessionStorage.userData = localStorage.userData;
    }

    if (!userData?.code) {
        userData = { code: SourceCode.fromString(helloWorldExample).layoutCode() };
    }

    const defaultColorMode = colorModes[Number(prefersDarkColorScheme())];
    userData.delay = userData.delay ?? 250;
    userData.breakpoints = userData.breakpoints ?? [];
    userData.colorMode = colorModes.includes(userData.colorMode) ? userData.colorMode : defaultColorMode;
    userData.colorOffset = userData.colorOffset ?? 0;
    userData.input = userData.input ?? '';
    userData.inputMode = isValidInputMode(userData.inputMode) ? userData.inputMode : inputModeArguments;
    userData.utf8Output = userData.utf8Output ?? true;
    userData.edgeTransitionMode = userData.edgeTransitionMode ?? true;
    userData.showArrows = userData.showArrows ?? false;
    userData.showIPs = userData.showIPs ?? false;
    return userData;
}

function clearLocationHash() {
    // After consuming the hash, move the URL to the export box and remove it from the location.
    // Otherwise, changes in localStorage would be overwritten when reloading the page.
    // For some reason, calling replaceState while in the constructor of a React component
    // can cause the page to reload, so delay it until the next event cycle.
    window.setTimeout(() => history.replaceState(null, '', '/'));
}

export class App extends React.Component {
    constructor(props) {
        super(props);
        const userData = loadUserData();
        this.state = {
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
        };

        const hashData = loadHashData();
        if (hashData && hashData.code) {
            App.applyHashDataToState(this.state, hashData);
            // This is a new tab. Copy its state to sessionStorage so that it will be
            // independent of existing tabs.
            this.saveUserData();
            clearLocationHash();
        }

        this.state.sourceCode = SourceCode.fromString(this.state.userData.code).toObject();
        this.hexagony = null;
        this.gridView = null;
        this.executionHistory = [];
        this.startingToPlay = false;

        this.updateColorMode();
    }

    saveUserData() {
        const serializedData = JSON.stringify(this.state.userData);
        sessionStorage.userData = serializedData;
        localStorage.userData = serializedData;
    }

    static canUndo(state) {
        const { isRunning, undoStack } = state;
        return undoStack.length !== 0 &&
            (!isRunning || !undoStack[undoStack.length - 1].isSizeChange);
    }

    static canRedo(state) {
        const { isRunning, redoStack } = state;
        return redoStack.length !== 0 &&
            (!isRunning || !redoStack[redoStack.length - 1].isSizeChange);
    }

    updateCodeCallback = (i, j, char) =>
        this.setState(produce(state => App.applyCodeChangeToState(state, char, i, j)));

    setSourceCode = newCode =>
        this.setState(produce(state => App.applyCodeChangeToState(state, newCode)));

    applySourceCodeChange = sourceCodeToNewCode =>
        this.setState(produce(state =>
            App.applyCodeChangeToState(state,
                sourceCodeToNewCode(SourceCode.fromObject(state.sourceCode)))));

    onLayoutCode = () =>
        this.applySourceCodeChange(sourceCode => sourceCode.layoutCode());

    onMinifyCode = () =>
        this.applySourceCodeChange(sourceCode => sourceCode.minifyCode());

    onBigger = () =>
        this.applySourceCodeChange(sourceCode => sourceCode.resizeCode(sourceCode.size + 1));

    onReset = () =>
        this.applySourceCodeChange(sourceCode => sourceCode.resetCode());

    onReverseMemoryMovement = () => {
        const { state } = this;
        const oldCode = SourceCode.fromObject(state.sourceCode).toString();
        const newCode = oldCode.replace(/\{|}|'|"/g, match => {
            switch (match) {
                case '{':
                    return '}';
                case '}':
                    return '{';
                case "'":
                    return '"';
                case '"':
                    return "'";
            }
        });

        if (newCode === oldCode) {
            console.log('ommmmppp');
            return;
        }

        // Can't use applySourceCodeChange, because side effects (the confirm dialog)
        // aren't compatible with produce.
        if (!newCode.match(/-|:|%|\^|&/) ||
            confirm('Reversing the direction of memory movement commands will change the functionality of this program.')) {
            this.setState(produce(state => App.applyCodeChangeToState(state, newCode)));
        }
    };

    onSmaller = () => {
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

    onUndo = () =>
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

    onRedo = () =>
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

    static applyCodeChangeToState(state, newCode, i=null, j=null) {
        const { isUndoRedoInProgress, sourceCode, userData } = state;

        if (i !== null) {
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

    onInputChanged = value =>
        this.setState(produce(state => {
            state.userData.input = value;
            state.isGeneratedLinkUpToDate = false;
        }));

    onInputModeChanged = value =>
        this.setState(produce(state => {
            state.userData.inputMode = value;
            state.isGeneratedLinkUpToDate = false;
        }));

    onSpeedSliderChanged = rawValue => {
        const value = Math.floor(10 ** -3 * (1000 - rawValue) ** 2);
        this.setState(produce(state => {
            state.userData.delay = value;
            state.animationDelay = getAnimationDelay(value);
        }));
    };

    breakpointExistsAt(i, j) {
        const id = `${i},${j}`;
        return this.state.userData.breakpoints.indexOf(id) > -1;
    }

    * getBreakpoints() {
        for (const id of this.state.userData.breakpoints) {
            yield id.split(',').map(Number);
        }
    }

    onDeleteBreakpoints = () => {
        for (const [i, j] of this.getBreakpoints()) {
            this.gridView.setBreakpointState(i, j, false);
        }

        this.setState(produce(state => { state.userData.breakpoints = []; }));
    };

    toggleBreakpointCallback = (i, j) => {
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

    static applyHashDataToState(state, hashData) {
        state.userData.code = hashData.code;

        if (isValidInputMode(hashData.inputMode)) {
            state.userData.inputMode = hashData.inputMode;
        }

        if (hashData.input) {
            state.userData.input = hashData.input;
        }

        state.link = hashData.link;
        state.isGeneratedLinkUpToDate = true;
    }

    loadDataFromURL = () => {
        const hashData = loadHashData();

        if (hashData && hashData.code) {
            // Stop execution first, as the hexagon size may change.
            this.onStop();
            this.setState(produce(state => {
                App.applyCodeChangeToState(state, hashData.code);
                App.applyHashDataToState(state, hashData);
            }));
            clearLocationHash();
        }
    };

    onGenerateLink = () => {
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

    onGenerateAndCopyLink = () => navigator.clipboard.writeText(this.onGenerateLink());

    onPlayPause = () => {
        if (this.isPlaying()) {
            this.onPause();
        }
        else {
            this.onStart();
        }
    };

    onStart = () => this.stepHelper(true);

    onStep = () => {
        this.stepHelper();
        this.onPause();
    };

    static getInput(state) {
        const { userData } = state;
        let { input } = userData;
        if (userData.inputMode === inputModeArguments) {
            input = input.replace(/\n/g, '\0');
        }
        return input;
    }

    startEdgeAnimation(connectors, name) {
        if (connectors) {
            connectors.forEach(x => {
                x.classList.add(name);
                x.style.animationDuration = this.state.animationDelay;
            });
        }
    }

    edgeEventHandler = (edgeName, isBranch) => {
        // Don't show edge transition animations when running at high speed.
        const { userData } = this.state;
        if (userData.edgeTransitionMode && (userData.delay || !this.isPlaying())) {
            const name = isBranch ? 'connectorFlash' : 'connectorNeutralFlash';
            this.startEdgeAnimation(this.gridView.edgeConnectors[edgeName], name);
            this.startEdgeAnimation(this.gridView.edgeConnectors2[edgeName], `${name}Secondary`);
        }
    };

    stepHelper(play = false) {
        if (this.isTerminated()) {
            return;
        }

        const { sourceCode, userData } = this.state;

        if (this.hexagony === null) {
            this.hexagony = new Hexagony(sourceCode, App.getInput(this.state), this.edgeEventHandler);
            this.executionHistory = arrayInitialize(6, index => {
                const [coords, dir] = this.hexagony.getIPState(index);
                const [i, j] = this.hexagony.axialToIndex(coords);
                return [[i, j, dir]];
            });
            window.totalTime = 0;
        }

        if (play) {
            this.startingToPlay = true;
        }

        const { hexagony } = this;
        let breakpoint = false;

        let maximumSteps = 1;
        if (play && userData.delay === 0) {
            // Move one extra step, if execution hasn't started yet.
            maximumSteps = maxSpeedIterations + !hexagony.ticks;
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
        window.totalTime += p2 - p1;

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

    getInfoPanelProps() {
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

    getStatePanelProps() {
        const { hexagony } = this;
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

    onPause = () => this.setState(produce(state => App.pause(state)));

    static pause(state) {
        const { timeoutID } = state;
        if (timeoutID !== null) {
            window.clearTimeout(timeoutID);
            state.timeoutID = null;
        }
    }

    onStop = () => {
        this.hexagony = null;
        this.executionHistory = null;
        this.gridView.clearCellExecutionColors();
        this.setState(produce(state => {
            App.pause(state);
            state.ticks = 0;
            state.isRunning = false;
        }));
    };

    resetCellColors() {
        if (this.hexagony != null) {
            const { selectedIp } = this.state;
            this.gridView.updateActiveCell(this.executionHistory, selectedIp, this.hexagony.getExecutedGrid(), true);
        }
    }

    onSelectedIPChanged = ip =>
        this.setState({ selectedIp: ip });

    isPlaying() {
        return this.startingToPlay || this.state.timeoutID !== null;
    }

    isTerminated() {
        return this.hexagony != null && this.hexagony.getTerminationReason() != null;
    }

    onKeyDown = e => {
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
                if (e.target.id !== 'inputBox') {
                    this.onUndo();
                    e.preventDefault();
                }
            }
            else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
                if (e.target.id !== 'inputBox') {
                    this.onRedo();
                    e.preventDefault();
                }
            }
        }
    };

    updateColorMode() {
        const { userData } = this.state;
        applyColorMode(this.state.userData.colorMode);
        initializeGridColors(userData.colorMode, userData.colorOffset);
    }

    onColorPropertyChanged() {
        this.updateColorMode();
        // It's easier to recreate the grid than to update all color-related class names.
        this.gridView.recreateGrid(this.hexagony ? this.hexagony.getExecutedGrid() : null);
        this.gridView.setBreakpoints(this.getBreakpoints());
    }

    onEdgeTransitionModeChanged() {
        const { userData } = this.state;
        this.gridView.edgeTransitionMode = userData.edgeTransitionMode;
        this.gridView.recreateGrid(this.hexagony ? this.hexagony.getExecutedGrid() : null);
        this.gridView.setBreakpoints(this.getBreakpoints());
    }

    toggleEdgeTransitionMode = () =>
        this.setState(produce(state => { state.userData.edgeTransitionMode = !state.userData.edgeTransitionMode; }));

    toggleArrows = () =>
        this.setState(produce(state => { state.userData.showArrows = !state.userData.showArrows; }));

    toggleIPs = () =>
        this.setState(produce(state => { state.userData.showIPs = !state.userData.showIPs; }));

    toggleDarkMode = () =>
        this.setState(produce(state => { state.userData.colorMode = colorModes[1 - colorModes.indexOf(state.userData.colorMode)]; }));

    cycleColorOffset = () =>
        this.setState(produce(state => { state.userData.colorOffset = (state.userData.colorOffset + 1) % 6; }));

    onUtf8OutputChanged = newValue =>
        this.setState(produce(state => { state.userData.utf8Output = newValue; }));

    componentDidMount() {
        const { animationDelay, sourceCode, userData } = this.state;

        this.gridView = new GridView(this.updateCodeCallback, this.toggleBreakpointCallback);
        this.gridView.edgeTransitionMode = userData.edgeTransitionMode;
        this.gridView.setDelay(animationDelay);
        this.gridView.setShowArrows(userData.showArrows);
        this.gridView.setShowIPs(userData.showIPs);
        this.gridView.setSourceCode(sourceCode);
        this.gridView.setBreakpoints(this.getBreakpoints());

        document.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('hashchange', this.loadDataFromURL);
    }

    componentWillUnmount() {
        document.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('hashchange', this.loadDataFromURL);
    }

    componentDidUpdate(prevProps, prevState) {
        const { animationDelay, selectedIp, sourceCode, userData } = this.state;
        const prevUserData = prevState.userData;
        const prevSourceCode = prevState.sourceCode;

        if (userData !== prevUserData) {
            if (prevState) {
                this.saveUserData();
            }

            if (userData.code !== prevUserData.code) {
                if (this.hexagony !== null) {
                    // The code should be the same size hexagon.
                    // When running, undo/redo is disabled for different size hexagons,
                    // the resize buttons are disabled, and the import/export panel is hidden.
                    this.hexagony.setSourceCode(sourceCode);
                }

                this.gridView.setSourceCode(sourceCode);
                if (sourceCode.size !== prevSourceCode.size) {
                    // Replace breakpoints, because the grid has been recreated.
                    this.gridView.setBreakpoints(this.getBreakpoints());
                }
            }

            if (userData.colorMode !== prevUserData.colorMode ||
                userData.colorOffset !== prevUserData.colorOffset) {
                this.onColorPropertyChanged();
            }

            if (userData.showIPs !== prevUserData.showIPs) {
                this.gridView.setShowIPs(userData.showIPs);
            }

            if (userData.showArrows !== prevUserData.showArrows) {
                this.gridView.setShowArrows(userData.showArrows);
                this.resetCellColors();
            }

            if (userData.edgeTransitionMode !== prevUserData.edgeTransitionMode) {
                this.onEdgeTransitionModeChanged();
            }
            else if (userData.breakpoints !== prevUserData.breakpoints) {
                this.gridView.setBreakpoints(this.getBreakpoints());
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
            this.gridView.setDelay(animationDelay);
        }
    }

    render() {
        const { animationDelay, link, isGeneratedLinkUpToDate, isRunning, userData } = this.state;
        const { hexagony } = this;
        const mainContent = hexagony !== null ?
            <>
                <OutputPanel
                    outputBytes={this.hexagony.output}
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
                <HotkeysPanel/>
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
                                onBigger={this.onBigger}
                                onDeleteBreakpoints={this.onDeleteBreakpoints}
                                onRedo={this.onRedo}
                                onReset={this.onReset}
                                onReverseMemoryMovement={this.onReverseMemoryMovement}
                                onSmaller={this.onSmaller}
                                onUndo={this.onUndo}/>
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
