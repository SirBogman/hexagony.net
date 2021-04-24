import React from 'react';
import ReactDOM from 'react-dom';
import produce from 'immer';
import LZString from 'lz-string';

import { Hexagony } from '../hexagony/hexagony.mjs';
import { arrayInitialize, countBytes, countCodepoints, countOperators, getCodeLength, getHexagonSize, getRowCount, getRowSize, layoutSource, minifySource, removeWhitespaceAndDebug } from '../hexagony/util.mjs';
import { GridView, initializeGridColors } from '../view/gridview.mjs';
import { applyColorMode, colorModes, darkColorMode, prefersDarkColorScheme } from '../view/viewutil.mjs';

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

function loadUserData() {
    let userData = parseStorage(sessionStorage.userData);

    if (!userData?.code) {
        userData = parseStorage(localStorage.userData);
        // This is a new tab. Copy its state to sessionStorage so that it will be
        // independent of existing tabs.
        sessionStorage.userData = localStorage.userData;
    }

    if (!userData?.code) {
        userData = { code: layoutSource(helloWorldExample) };
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

export class App extends React.Component {
    constructor(props) {
        super(props);
        const userData = loadUserData();
        this.state = {
            userData,
            selectedIp: 0,
            link: '',
            isGeneratedLinkUpToDate: false,
            animationDelay: getAnimationDelay(userData.delay),
            terminationReason: null,
            ticks: 0,
            timeoutID: null,
        };

        this.hexagony = null;
        this.gridView = null;
        this.executionHistory = [];
        this.startingToPlay = false;

        // TODO: this.loadDataFromURL?
        this.updateColorMode();
    }

    updateCode = code => {
        // Clear breakpoints that non longer fit.
        // The gridView will automatically discard UI elements associated with them when the size changes.
        const filteredCode = removeWhitespaceAndDebug(code);
        const newSize = getHexagonSize(countCodepoints(filteredCode));
        const newRowCount = getRowCount(newSize);
        const breakpoints = this.state.userData.breakpoints.filter(id => {
            const [i, j] = id.split(',').map(Number);
            return i < newRowCount && j < getRowSize(newSize, i);
        });

        this.setState(produce(state => {
            state.userData.code = code;
            state.isGeneratedLinkUpToDate = false;

            // Avoid changing from one empty array to another and triggering saving data on load.
            if (state.userData.breakpoints.length !== breakpoints.length) {
                state.userData.breakpoints = breakpoints;
            }
        }));
    };

    getImportExportPanelProps() {
        const { isGeneratedLinkUpToDate, link, userData } = this.state;
        return {
            isGeneratedLinkUpToDate,
            link,
            sourceCode: userData.code,
            onGenerateLink: this.onGenerateLink,
            onGenerateAndCopyLink: this.onGenerateAndCopyLink,
            onImportSourceCode: this.setSourceCode,
            onLayoutCode: this.onLayoutCode,
            onMinifyCode: this.onMinifyCode,
        };
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

    getInputPanelProps() {
        const { userData } = this.state;
        return {
            input: userData.input,
            inputMode: userData.inputMode,
            onInputChanged: this.onInputChanged,
            onInputModeChanged: this.onInputModeChanged,
        };
    }

    onSpeedSliderChanged = rawValue => {
        const value = Math.floor(10 ** -3 * (1000 - rawValue) ** 2);
        this.setState(produce(state => {
            state.userData.delay = value;
            state.animationDelay = getAnimationDelay(value);
        }));
    };

    getPlayControlsProps() {
        return {
            canPlayPause: !this.isTerminated(),
            canStep: !this.isTerminated() && !this.isPlaying(),
            canStop: this.isRunning(),
            delay: this.state.userData.delay,
            isPlaying: this.isPlaying(),
            onPlayPause: this.onPlayPause,
            onSpeedSliderChanged: this.onSpeedSliderChanged,
            onStep: this.onStep,
            onStop: this.onStop,
        };
    }

    getEditControlsProps() {
        const running = this.isRunning();
        return {
            canDeleteBreakpoints: this.state.userData.breakpoints.length !== 0,
            canEdit: !running,
            canRedo: this.gridView !== null && this.gridView.canRedo(running),
            canUndo: this.gridView !== null && this.gridView.canUndo(running),
            onBigger: this.onBigger,
            onDeleteBreakpoints: this.onDeleteBreakpoints,
            onRedo: this.onRedo,
            onReset: this.onReset,
            onSmaller: this.onSmaller,
            onUndo: this.onUndo,
        };
    }

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

    loadDataFromURL = () => {
        let newData = undefined;

        if (location.hash.startsWith('#lz')) {
            try {
                if (location.hash) {
                    newData = JSON.parse(LZString.decompressFromBase64(location.hash.slice(3)));
                }
            }
            // eslint-disable-next-line no-empty
            catch (e) {
            }
        }
        else if (location.hash === '#fibonacci') {
            newData = { code: ')="/}.!+/M8;' };
        }
        else if (location.hash === '#helloworld') {
            newData = { code: layoutSource('H;e;/;o;W@>r;l;l;;o;Q\\;0P;2<d;P1;') };
        }

        if (location.hash) {
            // After consuming the hash, move the URL to the export box and remove it from the location.
            // Otherwise, changes in localStorage will be overwritten when reloading the page.
            this.setState(produce(state => { state.link = location.href; }));
            history.replaceState(null, '', location.origin);
        }

        if (newData && newData.code) {
            // Stop execution first, as the hexagon size may change.
            this.onStop();
            this.setSourceCode(newData.code);

            this.setState(produce(state => {
                if (isValidInputMode(newData.inputMode)) {
                    state.userData.inputMode = newData.inputMode;
                }

                if (newData.input) {
                    state.userData.input = newData.input;
                }

                //updateInputPanel();
                state.userData.isGeneratedLinkUpToDate = true;
                //saveData();
            }));
        }
    };

    onMinifyCode = () => this.setSourceCode(minifySource(this.state.userData.code));

    onLayoutCode = () => this.setSourceCode(layoutSource(this.state.userData.code));

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

    getInput() {
        const { userData } = this.state;
        let input = userData.input;
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

        const { userData } = this.state;

        if (this.hexagony === null) {
            this.hexagony = new Hexagony(userData.code, this.getInput(), this.edgeEventHandler);
            this.executionHistory = arrayInitialize(6, index => {
                const [coords, dir] = this.hexagony.getIPState(index);
                const [i, j] = this.hexagony.grid.axialToIndex(coords);
                return [[i, j, dir.angle]];
            });
            window.totalTime = 0;
        }

        if (play) {
            this.startingToPlay = true;
        }

        const hexagony = this.hexagony;
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
            const [i, j] = hexagony.grid.axialToIndex(hexagony.coords);
            const angle = hexagony.dir.angle;

            // The active coordinates don't change when the program terminates.
            if (!this.isTerminated()) {
                const ip = hexagony.activeIp;
                const previous = this.executionHistory[ip];
                if (i != previous[0][0] || j != previous[0][1] || angle != previous[0][2]) {
                    this.executionHistory[ip] = [[i, j, angle], ...previous.slice(0, executionHistoryCount)];
                }
            }

            if (this.breakpointExistsAt(i, j)) {
                breakpoint = true;
                play = false;
            }
        }

        const p2 = performance.now();
        window.totalTime += p2 - p1;

        const selectedIp = hexagony.activeIp;
        const forceUpdateExecutionState = stepCount > 1;
        this.gridView.updateActiveCell(this.executionHistory, selectedIp, hexagony.getExecutedGrid(), false, forceUpdateExecutionState);
        this.startingToPlay = false;

        const timeoutID = play && this.isRunning() && !this.isTerminated() ?
            window.setTimeout(this.onStart, userData.delay) :
            null;

        this.setState({
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
        const hexagony = this.hexagony;
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
            info: this.getInfoPanelProps(),
            onSelectedIPChanged: this.onSelectedIPChanged,
        };
    }

    getViewControlsProps() {
        const { userData } = this.state;
        return {
            edgeTransitionModeEnabled: userData.edgeTransitionMode,
            arrowsEnabled: userData.showArrows,
            ipsEnabled: userData.showIPs,
            darkModeEnabled: userData.colorMode === darkColorMode,
            toggleEdgeTransitionMode: this.toggleEdgeTransitionMode,
            toggleArrows: this.toggleArrows,
            toggleIPs: this.toggleIPs,
            toggleDarkMode: this.toggleDarkMode,
        };
    }

    resizeCode(size) {
        const oldCode = removeWhitespaceAndDebug(this.state.userData.code);
        const oldSize = getHexagonSize(countCodepoints(oldCode));
        let newCode = '';

        if (size > oldSize) {
            const iterator = oldCode[Symbol.iterator]();
            for (let i = 0; i < getRowCount(oldSize); i++) {
                for (let j = 0; j < getRowSize(oldSize, i); j++) {
                    newCode += iterator.next().value || '.';
                }

                newCode += '.'.repeat(getRowSize(size, i) - getRowSize(oldSize, i));
            }
        }
        else {
            const iterator = oldCode[Symbol.iterator]();
            for (let i = 0; i < getRowCount(size); i++) {
                for (let j = 0; j < getRowSize(size, i); j++) {
                    newCode += iterator.next().value || '.';
                }

                for (let j = getRowSize(oldSize, i) - getRowSize(size, i); j > 0; j--) {
                    iterator.next();
                }
            }
        }

        newCode += '.'.repeat(getCodeLength(size) - countCodepoints(newCode));
        newCode = minifySource(newCode);
        return newCode;
    }

    resize(size) {
        const p1 = performance.now();
        this.setSourceCode(this.resizeCode(size));
        const p2 = performance.now();
        console.log(`resize ${size} took ${p2 - p1}`);
    }

    onBigger = () => this.resize(this.gridView.size + 1);

    onReset = () => this.reset(this.gridView.size);

    onSmaller = () => {
        const newCode = this.resizeCode(this.gridView.size - 1);
        if (countOperators(this.state.userData.code) == countOperators(newCode) ||
            confirm('Shrink the hexagon? Code will be lost, but this can be undone.')) {
                this.resize(Math.max(1, this.gridView.size - 1));
        }
    };

    onRedo = () => this.gridView.redo();

    onUndo = () => this.gridView.undo();

    reset(size) {
        this.setSourceCode('.'.repeat(getCodeLength(size - 1) + 1));
    }

    setSourceCode = newCode => this.gridView.setSourceCode(newCode);

    onPause = () => {
        const { timeoutID } = this.state;
        if (timeoutID !== null) {
            window.clearTimeout(timeoutID);
            this.setState({ timeoutID: null });
        }
    };

    onStop = () => {
        this.hexagony = null;
        this.executionHistory = null;
        this.gridView.clearCellExecutionColors();
        this.onPause();
        this.setState({ ticks: 0 });
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

    // Returns whether the view is in execution mode. This includes just after the program
    // terminates, so that the user can see its state.
    isRunning() {
        return this.hexagony != null;
    }

    isTerminated() {
        return this.hexagony != null && this.hexagony.getTerminationReason() != null;
    }

    onKeyDown = e => {
        if (e.ctrlKey) {
            if (e.key == '.') {
                this.onStep();
                e.preventDefault();
            }
            else if (e.key == 'Enter') {
                if (e.shiftKey) {
                    this.onStop();
                }
                else {
                    this.onPlayPause();
                }
                e.preventDefault();
            }
            else if (e.key == 'z') {
                if (e.target.id !== 'inputBox') {
                    if (this.gridView.canUndo(this.isRunning())) {
                        this.gridView.undo();
                    }
                    e.preventDefault();
                }
            }
            else if (e.key == 'y') {
                if (e.target.id !== 'inputBox') {
                    if (this.gridView.canRedo(this.isRunning())) {
                        this.gridView.redo();
                    }
                    e.preventDefault();
                }
            }
        }
        // console.log(`keydown ${e.key} ${e.ctrlKey} ${e.shiftKey} ${e.altKey} ${Object.keys(e)}`);
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

    getOutputPanelProps() {
        return {
            outputBytes: this.hexagony.output,
            utf8Output: this.state.userData.utf8Output,
            onUtf8OutputChanged: this.onUtf8OutputChanged,
        };
    }

    onUtf8OutputChanged = newValue =>
        this.setState(produce(state => { state.userData.utf8Output = newValue; }));

    componentDidMount() {
        const { animationDelay, userData } = this.state;
        this.gridView = new GridView(this.updateCode, this.toggleBreakpointCallback);
        this.gridView.edgeTransitionMode = userData.edgeTransitionMode;
        this.gridView.setDelay(animationDelay);
        this.gridView.setShowArrows(userData.showArrows);
        this.gridView.setShowIPs(userData.showIPs);
        this.gridView.setSourceCode(userData.code);

        document.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('hashchange', this.loadDataFromURL);
    }

    componentWillUnmount() {
        document.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('hashchange', this.loadDataFromURL);
    }

    componentDidUpdate(prevProps, prevState) {
        const { animationDelay, selectedIp, userData } = this.state;
        const prevUserData = prevState.userData;

        if (userData !== prevUserData) {
            // TODO: make sure init finished before saving data?
            if (prevState) {
                for (const thing in userData) {
                    if (userData[thing] != prevUserData[thing]) {
                        console.log(`CHANGED: ${thing} OLD: ${prevUserData[thing]} NEW: ${userData[thing]}`);
                    }
                }
                console.log('Save DATA!');
                const serializedData = JSON.stringify(this.state.userData);
                sessionStorage.userData = serializedData;
                localStorage.userData = serializedData;
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

            if (this.hexagony !== null) {
                if (userData.code !== prevUserData.code) {
                    // The code should be the same size hexagon.
                    // When running, undo/redo is disabled for different size hexagons,
                    // the resize buttons are disabled, and the import/export panel is hidden.
                    this.hexagony.setSourceCode(userData.code);
                }

                if (userData.input !== prevUserData.input ||
                    userData.inputMode !== prevUserData.inputMode) {
                    this.hexagony.setInput(this.getInput());
                }
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
        const { animationDelay } = this.state;
        const hexagony = this.hexagony;
        const mainContent = hexagony !== null ?
            <>
                <OutputPanel {...this.getOutputPanelProps()}/>
                <MemoryPanel memory={hexagony.memory} delay={animationDelay}/>
                <StatePanel {...this.getStatePanelProps()}/>
            </> :
            <>
                <InfoPanel {...this.getInfoPanelProps()}/>
                <ImportExportPanel {...this.getImportExportPanelProps()}/>
                <HotkeysPanel/>
            </>;

        return (
            <>
                <div id="appGrid" className={hexagony ? 'playGrid' : 'editGrid'}>
                    <header>
                        <nav>
                            <NavigationLinks/>
                            <ViewControls {...this.getViewControlsProps()}/>
                            <EditControls {...this.getEditControlsProps()}/>
                            <PlayControls {...this.getPlayControlsProps()}/>
                        </nav>
                    </header>
                    <CodePanel/>
                    <InputPanel {...this.getInputPanelProps()}/>
                    {mainContent}
                </div>
            </>
        );
    }
}
