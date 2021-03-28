import { Hexagony } from './hexagony/hexagony.mjs';
import { arrayInitialize, countBytes, countCodepoints, countOperators, getCodeLength, getHexagonSize, getRowCount, getRowSize, layoutSource, minifySource, removeWhitespaceAndDebug } from './hexagony/util.mjs';
import { GridView } from './view/gridview.mjs';
import { MemoryView } from './view/memoryview.mjs';
import { setChecked } from './view/viewutil.mjs';
import { LZString } from './lz-string.min.js';
import { updateStatePanel, setSelectedIPChangedCallback } from './StatePanel.jsx';
import { updateInfoPanel } from './InfoPanel.jsx';
import panzoom from 'panzoom';

import '../css/index.scss';

const HELLO_WORLD_EXAMPLE = 'H;e;/;o;W@>r;l;l;;o;Q\\;0P;2<d;P1;';

const MAX_SPEED_ITERATIONS = 10000;
const EXECUTION_HISTORY_COUNT = 20;

const appGrid = document.querySelector('#app_grid');
const playContent = document.querySelectorAll('.play_content');
const editContent = document.querySelectorAll('.edit_content');

const sourceCodeInput = document.querySelector('#sourcecode');
const inputBox = document.querySelector('#input');
const infoInfo = document.querySelector('#info_info');
const stateInfo = document.querySelector('#state_info');

const smallerButton = document.querySelector('#smaller');
const resetButton = document.querySelector('#reset');
const deleteBreakpointsButton = document.querySelector('#delete_breakpoints');
const biggerButton = document.querySelector('#bigger');
const undoButton = document.querySelector('#undo');
const redoButton = document.querySelector('#redo');

const startButton = document.querySelector('#start');
const stepButton = document.querySelector('#step');
const pauseButton = document.querySelector('#pause');
const stopButton = document.querySelector('#stop');
const speedSlider = document.querySelector('#speed_slider');

const minifyButton = document.querySelector('#minify');
const layoutButton = document.querySelector('#layout');
const generateLinkButton = document.querySelector('#generate_link');
const copyLinkButton = document.querySelector('#copy_link');
const editButtons = [smallerButton, resetButton, biggerButton, minifyButton, layoutButton];

const inputArgumentsRadioButton = document.querySelector('#arguments');
const inputRawRadioButton = document.querySelector('#raw');
const inputModeRadioButtons = [inputArgumentsRadioButton, inputRawRadioButton];

const urlExportText = document.querySelector('#url_export');

const outputBox = document.querySelector('#output');
const terminationReasonText = document.querySelector('#termination_reason');

const edgeTransitionButton = document.querySelector('#edge_transition');
const toggleArrowsButton = document.querySelector('#toggle_arrows');
const toggleIPsButton = document.querySelector('#toggle_ips');

const memorySvg = document.querySelector('#memory_svg');
const resetViewButton = document.querySelector('#reset_view');

let gridView;
let hexagony;
let memoryView;
let executionHistory = [];
let selectedIp = 0;
let initFinished = false;
let memoryPanZoom;
let userData;
let animationDelay;

function updateCode(code, isProgrammatic=false) {
    userData.code = code;

    // Clear breakpoints that non longer fit.
    // The gridView will automatically discard UI elements associated with them when the size changes.
    const filteredCode = removeWhitespaceAndDebug(code);
    const newSize = getHexagonSize(countCodepoints(filteredCode));
    const newRowCount = getRowCount(newSize);
    userData.breakpoints = userData.breakpoints.filter(id => {
        const [i, j] = id.split(',').map(Number);
        return i < newRowCount && j < getRowSize(newSize, i);
    });
    updateBreakpointCountText();

    gridView.setBreakpoints(getBreakpoints());

    sourceCodeInput.value = code;
    if (!isProgrammatic && initFinished) {
        saveData();
    }
    updateInfo();
    invalidateGeneratedURL();

    if (hexagony != null) {
        // The code should be the same size hexagon.
        // When running, undo/redo is disabled for different size hexagons,
        // the resize buttons are disabled, and the import/export panel is hidden.
        hexagony.setSourceCode(code);
    }
}

function onInputChanged() {
    userData.input = inputBox.value;
    saveData();
    invalidateGeneratedURL();
    if (hexagony != null) {
        hexagony.setInput(getInput());
    }
}

function updateInputTextArea() {
    inputBox.value = userData.input ?? '';
}

function onInputModeChanged() {
    userData.inputMode = inputArgumentsRadioButton.checked ? inputArgumentsRadioButton.value : inputRawRadioButton.value;
    saveData();
    invalidateGeneratedURL();
    if (hexagony != null) {
        hexagony.setInput(getInput());
    }
}

function updateInputModeButtons() {
    for (const radioButton of inputModeRadioButtons) {
        if (userData.inputMode == radioButton.value) {
            radioButton.checked = true;
            break;
        }
    }
}

function updateAnimationDelay(value) {
    userData.delay = value;
    // Use a default value for high-speed mode, where delay is set to zero.
    animationDelay = `${userData.delay || 250}ms`;
    gridView.setDelay(animationDelay);
}

function onSpeedSliderChanged() {
    updateAnimationDelay(Math.floor(10 ** -3 * (1000 - speedSlider.value) ** 2));
    saveData();
}

function updateSpeedSlider() {
    speedSlider.value = 1000 - Math.sqrt(1000 * userData.delay);
}

function invalidateGeneratedURL() {
    generateLinkButton.disabled = false;
}

function updateButtons() {
    const running = isRunning();
    editButtons.forEach(x => x.disabled = running);

    deleteBreakpointsButton.disabled = userData.breakpoints.length === 0;
    undoButton.disabled = !gridView.canUndo(running);
    redoButton.disabled = !gridView.canRedo(running);

    startButton.disabled = isTerminated() || isPlaying();
    stepButton.disabled = isTerminated() || isPlaying();
    stopButton.disabled = !running;
    pauseButton.disabled = isTerminated() || !isPlaying();

    if (running) {
        playContent.forEach(x => x.classList.remove('hidden_section'));
        editContent.forEach(x => x.classList.add('hidden_section'));
        appGrid.classList.replace('edit_grid', 'play_grid');
    }
    else {
        playContent.forEach(x => x.classList.add('hidden_section'));
        editContent.forEach(x => x.classList.remove('hidden_section'));
        appGrid.classList.replace('play_grid', 'edit_grid');
    }
}

function updateViewButtons() {
    setChecked(edgeTransitionButton, userData.edgeTransitionMode);
    setChecked(toggleArrowsButton, userData.showArrows);
    setChecked(toggleIPsButton, userData.showIPs);
}

function breakpointExistsAt(i, j) {
    const id = `${i},${j}`;
    return userData.breakpoints.indexOf(id) > -1;
}

function* getBreakpoints() {
    for (const id of userData.breakpoints) {
        yield id.split(',').map(Number);
    }
}

function clearBreakpoints() {
    for (const [i, j] of getBreakpoints()) {
        gridView.setBreakpointState(i, j, false);
    }

    userData.breakpoints = [];
    saveData();
    updateBreakpointCountText();
    updateButtons();
}

function toggleBreakpointCallback(i, j) {
    const id = `${i},${j}`;
    const index = userData.breakpoints.indexOf(id);
    if (index > -1) {
        userData.breakpoints.splice(index, 1);
        gridView.setBreakpointState(i, j, false);
    }
    else {
        userData.breakpoints.push(id);
        gridView.setBreakpointState(i, j, true);
    }
    saveData();
    updateBreakpointCountText();
    updateButtons();
}

// This should only be called once when initially loading.
function loadData() {
    userData = undefined;
    try {
        userData = JSON.parse(localStorage.userData);
    }
    // eslint-disable-next-line no-empty
    catch (e) {
    }

    if (!userData || !userData.code) {
        userData = { code: layoutSource(HELLO_WORLD_EXAMPLE) };
    }

    updateAnimationDelay(userData.delay ?? 250);
    userData.breakpoints = userData.breakpoints ?? [];
    gridView.edgeTransitionMode = userData.edgeTransitionMode = userData.edgeTransitionMode ?? true;
    userData.showArrows = userData.showArrows ?? false;
    gridView.setShowArrows(userData.showArrows);
    userData.showIPs = userData.showIPs ?? false;
    gridView.setShowIPs(userData.showIPs);

    updateInputModeButtons();
    updateInputTextArea();
    updateSpeedSlider();
}

function loadDataFromURL() {
    let newData = undefined;

    console.log(location.hash);

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
        urlExportText.value = location;
        history.replaceState(null, '', location.origin);
    }

    if (newData && newData.code) {
        setSourceCode(newData.code, !initFinished);

        for (const radioButton of inputModeRadioButtons) {
            if (newData.inputMode == radioButton.value) {
                userData.inputMode = newData.inputMode;
                updateInputModeButtons();
                break;
            }
        }

        userData.input = newData.input;
        updateInputTextArea();
        // Indicate that the generated URL is up to date.
        generateLinkButton.disabled = true;
        onStop();
        saveData();
    }
}

function generateLink() {
    const urlData = { code: userData.code, input: userData.input, inputMode: userData.inputMode };
    const json = JSON.stringify(urlData);
    // Disable button, until the code changes.
    generateLinkButton.disabled = true;
    urlExportText.value = `${location.origin}/#lz${LZString.compressToBase64(json)}`;
}

function copyLink() {
    generateLink();
    urlExportText.select();
    document.execCommand('copy');
}

function saveData() {
    localStorage.userData = JSON.stringify(userData);
}

function onStart() {
    stepHelper(true);
}

function onStep() {
    stepHelper();
    onPause();
}

function getInput() {
    let input = inputBox.value;
    if (inputArgumentsRadioButton.checked) {
        input = input.replaceAll(/\n/g, '\0');
    }
    return input;
}

function startEdgeAnimation(connectors, name) {
    if (connectors) {
        connectors.forEach(x => {
            x.classList.add(name);
            x.style.animationDuration = animationDelay;
        });
    }
}

function edgeEventHandler(edgeName, isBranch) {
    // Don't show edge transition animations when running at high speed.
    if (userData.edgeTransitionMode && (userData.delay || !isPlaying())) {
        const name = isBranch ? 'connector_flash' : 'connector_neutral_flash';
        startEdgeAnimation(gridView.edgeConnectors[edgeName], name);
        startEdgeAnimation(gridView.edgeConnectors2[edgeName], `${name}_secondary`);
    }
}

function stepHelper(play = false) {
    if (isTerminated()) {
        return;
    }

    if (hexagony == null) {
        hexagony = new Hexagony(userData.code, getInput(), edgeEventHandler);
        memoryView = new MemoryView(hexagony, memorySvg, memoryPanZoom);
        executionHistory = arrayInitialize(6, index => {
            const [coords, dir] = hexagony.getIPState(index);
            const [i, j] = hexagony.grid.axialToIndex(coords);
            return [[i, j, dir.angle]];
        });
        window.totalTime = 0;
    }

    let breakpoint = false;

    let maximumSteps = 1;
    if (play && userData.delay === 0) {
        // Move one extra step, if execution hasn't started yet.
        maximumSteps = MAX_SPEED_ITERATIONS + !hexagony.ticks;
    }

    let stepCount = 0;

    const p1 = performance.now();

    while (stepCount < maximumSteps && !breakpoint && !isTerminated()) {
        stepCount++;
        hexagony.step();
        const [i, j] = hexagony.grid.axialToIndex(hexagony.coords);
        const angle = hexagony.dir.angle;

        // The active coordinates don't change when the program terminates.
        if (!isTerminated()) {
            const ip = hexagony.activeIp;
            const previous = executionHistory[ip];
            if (i != previous[0][0] || j != previous[0][1] || angle != previous[0][2]) {
                executionHistory[ip] = [[i, j, angle], ...previous.slice(0, EXECUTION_HISTORY_COUNT)];
            }
        }

        if (breakpointExistsAt(i, j)) {
            breakpoint = true;
            play = false;
        }
    }

    const p2 = performance.now();
    window.totalTime += p2 - p1;

    selectedIp = hexagony.activeIp;
    const forceUpdateExecutionState = stepCount > 1;
    gridView.updateActiveCell(executionHistory, selectedIp, hexagony.getExecutedGrid(), false, forceUpdateExecutionState);

    outputBox.textContent = hexagony.output;
    outputBox.scrollTop = outputBox.scrollHeight;

    updateStateText();
    terminationReasonText.textContent =
        hexagony.getTerminationReason() ?? (breakpoint ? 'Stopped at breakpoint.' : null);

    if (play && isRunning() && !isTerminated()) {
        gridView.timeoutID = window.setTimeout(() => {
            gridView.timeoutID = null;
            onStart();
        }, userData.delay);
    }

    updateButtons();
    memoryView.update(animationDelay);
}

function updateBreakpointCountText() {
    updateStateText();
}

function getInfoPanelState() {
    const filteredCode = removeWhitespaceAndDebug(userData.code);
    const filteredCodepoints = countCodepoints(filteredCode);
    return {
        size: getHexagonSize(filteredCodepoints),
        chars: countCodepoints(userData.code),
        bytes: countBytes(userData.code),
        operators: countOperators(filteredCode)
    };
}

function updateInfo() {
    updateInfoPanel(infoInfo, getInfoPanelState());
}

function updateStateText() {
    if (!hexagony) {
        return;
    }

    updateStatePanel(stateInfo, {
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
        breakpoints: userData.breakpoints.length,
        ticks: hexagony.ticks.toLocaleString('en'),
        memoryPointer: hexagony.memory.mp,
        memoryDir: hexagony.memory.dir,
        memoryCw: hexagony.memory.cw ? 'CW' : 'CCW',
        info: getInfoPanelState(),
    });
}

function resizeCode(size) {
    const oldCode = removeWhitespaceAndDebug(userData.code);
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

function resize(size) {
    const p1 = performance.now();
    setSourceCode(resizeCode(size));
    const p2 = performance.now();
    console.log(`resize ${size} took ${p2 - p1}`);
}

function onShrink() {
    const newCode = resizeCode(gridView.size - 1);
    if (countOperators(userData.code) == countOperators(newCode) ||
        confirm('Shrink the hexagon? Code will be lost, but this can be undone.')) {
        resize(Math.max(1, gridView.size - 1));
    }
}

function reset(size) {
    setSourceCode('.'.repeat(getCodeLength(size - 1) + 1));
}

function setSourceCode(newCode, isProgrammatic=false) {
    sourceCodeInput.value = newCode;
    updateFromSourceCode(isProgrammatic);
}

function updateFromSourceCode(isProgrammatic=false) {
    gridView.setSourceCode(sourceCodeInput.value, isProgrammatic);
}

function onPause() {
    if (gridView.timeoutID != null) {
        window.clearTimeout(gridView.timeoutID);
        gridView.timeoutID = null;
        updateButtons();
    }
}

function onStop() {
    hexagony = null;
    memoryView = null;
    executionHistory = null;
    gridView.clearCellExecutionColors();
    updateButtons();
    onPause();
}

function resetCellColors() {
    if (hexagony != null) {
        gridView.updateActiveCell(executionHistory, selectedIp, hexagony.getExecutedGrid(), true);
    }
}

function onSelectedIPChanged(ip) {
    selectedIp = ip;
    resetCellColors();
    updateStateText();
}

function isPlaying() {
    return gridView.timeoutID != null;
}

// Returns whether the view is in execution mode. This includes just after the program
// terminates, so that the user can see its state.
function isRunning() {
    return hexagony != null;
}

function isTerminated() {
    return hexagony != null && hexagony.getTerminationReason() != null;
}

document.addEventListener('keydown', e => {
    if (e.ctrlKey) {
        if (e.key == '.') {
            onStep();
            e.preventDefault();
        }
        else if (e.key == 'Enter') {
            if (e.shiftKey) {
                onStop();
            }
            else if (isPlaying()) {
                onPause();
            }
            else {
                onStart();
            }
            e.preventDefault();
        }
        else if (e.key == 'z') {
            if (e.target != inputBox) {
                if (gridView.canUndo(isRunning())) {
                    gridView.undo();
                }
                e.preventDefault();
            }
        }
        else if (e.key == 'y') {
            if (e.target != inputBox) {
                if (gridView.canRedo(isRunning())) {
                    gridView.redo();
                }
                e.preventDefault();
            }
        }
    }
    // console.log(`keydown ${e.key} ${e.ctrlKey} ${e.shiftKey} ${e.altKey} ${Object.keys(e)}`);
});

function init() {
    setSelectedIPChangedCallback(onSelectedIPChanged);
    gridView = new GridView(updateCode, updateButtons, toggleBreakpointCallback);
    loadData();
    loadDataFromURL();
    sourceCodeInput.addEventListener('input', () => updateFromSourceCode(false));
    inputBox.addEventListener('input', onInputChanged);
    setSourceCode(userData.code, true);

    resetButton.addEventListener('click', () => reset(gridView.size));
    biggerButton.addEventListener('click', () => resize(gridView.size + 1));
    smallerButton.addEventListener('click', () => onShrink());
    undoButton.addEventListener('click', () => gridView.undo());
    redoButton.addEventListener('click', () => gridView.redo());

    deleteBreakpointsButton.addEventListener('click', clearBreakpoints);
    startButton.addEventListener('click', onStart);
    stepButton.addEventListener('click', onStep);
    stopButton.addEventListener('click', onStop);
    pauseButton.addEventListener('click', onPause);
    minifyButton.addEventListener('click', () => setSourceCode(minifySource(userData.code)));
    layoutButton.addEventListener('click', () => setSourceCode(layoutSource(userData.code)));
    generateLinkButton.addEventListener('click', generateLink);
    copyLinkButton.addEventListener('click', copyLink);

    inputArgumentsRadioButton.addEventListener('change', onInputModeChanged);
    inputRawRadioButton.addEventListener('change', onInputModeChanged);
    speedSlider.addEventListener('input', onSpeedSliderChanged);

    edgeTransitionButton.addEventListener('click', () => {
        gridView.edgeTransitionMode = userData.edgeTransitionMode = !userData.edgeTransitionMode;
        gridView.recreateGrid(hexagony ? hexagony.getExecutedGrid() : null);
        gridView.setBreakpoints(getBreakpoints());
        updateViewButtons();
        saveData();
    });

    toggleArrowsButton.addEventListener('click', () => {
        userData.showArrows = !userData.showArrows;
        gridView.setShowArrows(userData.showArrows);
        resetCellColors();
        updateViewButtons();
        saveData();
    });

    toggleIPsButton.addEventListener('click', () => {
        userData.showIPs = !userData.showIPs;
        gridView.setShowIPs(userData.showIPs);
        updateViewButtons();
        saveData();
    });

    resetViewButton.addEventListener('click', () => { if (memoryView) { memoryView.resetView(); } });

    updateButtons();
    updateViewButtons();

    memoryPanZoom = panzoom(memorySvg, {
        // Don't pan when clicking on text elements. This allows text selection.
        beforeMouseDown: e => e.target.nodeName === 'text',
        beforeDoubleClick: e => e.target.nodeName === 'text',
        zoomDoubleClickSpeed: 1.5,
        // 6.5% zoom per mouse wheel event:
        zoomSpeed: 0.065,
        // Don't listen for keyboard events.
        filterKey: () => true,
    });
    onhashchange = loadDataFromURL;
    initFinished = true;
}

init();
