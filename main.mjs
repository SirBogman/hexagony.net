import { Hexagony } from './hexagony/hexagony.mjs';
import { countBytes, countCodepoints, countOperators, getCodeLength, getHexagonSize, getRowCount, getRowSize, layoutSource, minifySource, removeWhitespaceAndDebug } from './hexagony/util.mjs';
import { GridView } from './view/gridview.mjs';
import { updateMemorySVG } from './view/memoryview.mjs';
import { setClass, setEnabledClass } from './view/viewutil.mjs';

import { LZString } from './lz-string.min.js';

const RECENTER_ANIMATION_DURATION = 1000;

// import { panzoom } from 'panzoom';

const puzzleParent = document.querySelector('#puzzle_parent');
const gridContainer = document.querySelector('#grid_container');
const playContent = document.querySelectorAll('.play_content')
const editContent = document.querySelectorAll('.edit_content')

const sourceCodeInput = document.querySelector('#sourcecode');
const inputBox = document.querySelector('#input');
const hexagonSizeText = document.querySelector('#hexagon_size');
const charCountText = document.querySelector('#char_count');
const byteCountText = document.querySelector('#byte_count');
const operatorCountText = document.querySelector('#operator_count');

const smallerButton = document.querySelector('#smaller');
const resetButton = document.querySelector('#reset');
const biggerButton = document.querySelector('#bigger');
const undoButton = document.querySelector('#undo');
const redoButton = document.querySelector('#redo');
const editPseudoButtons = [smallerButton, resetButton, biggerButton];

const startButton = document.querySelector('#start');
const stepButton = document.querySelector('#step');
const pauseButton = document.querySelector('#pause');
const stopButton = document.querySelector('#stop');
const speedSlider = document.querySelector('#speed_slider');

const minifyButton = document.querySelector('#minify');
const layoutButton = document.querySelector('#layout');
const generateLinkButton = document.querySelector('#generate_link');
const copyLinkButton = document.querySelector('#copy_link');
const editButtons = [minifyButton, layoutButton];

const inputArgumentsRadioButton = document.querySelector('#arguments');
const inputRawRadioButton = document.querySelector('#raw');
const inputModeRadioButtons = [inputArgumentsRadioButton, inputRawRadioButton];

const urlExportText = document.querySelector('#url_export');

const outputBox = document.querySelector('#output');
const executedCountText = document.querySelector('#executed_count');
const ipStateText = document.querySelector('#ip_state');
const terminationReasonText = document.querySelector('#termination_reason');

const edgeTransitionButton = document.querySelector('#edge_transition');
const edgeTransitionAnimationButton = document.querySelector('#edge_transition_animation');

let gridView;
let hexagony;
let initFinished = false;
let isEdgeTransition;
let memoryPanZoom;
let userData;

function updateCode(code, isProgrammatic=false) {
    userData.code = code;
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

function onSpeedSliderChanged() {
    userData.delay = Math.floor(10 ** -3 * (1000 - speedSlider.value) ** 2);
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
    editPseudoButtons.forEach(x => setEnabledClass(x, !running));

    setEnabledClass(undoButton, gridView.canUndo(running));
    setEnabledClass(redoButton, gridView.canRedo(running));

    setEnabledClass(startButton, !isTerminated() && !isPlaying());
    setEnabledClass(stepButton, !isTerminated() && !isPlaying());
    setEnabledClass(stopButton, running);
    setEnabledClass(pauseButton, !isTerminated() && isPlaying());

    if (running) {
        playContent.forEach(x => x.classList.remove('hidden_section'));
        editContent.forEach(x => x.classList.add('hidden_section'));
        gridContainer.classList.replace('edit_grid', 'play_grid');
    }
    else {
        playContent.forEach(x => x.classList.add('hidden_section'));
        editContent.forEach(x => x.classList.remove('hidden_section'));
        gridContainer.classList.replace('play_grid', 'edit_grid');
    }
}

function updateViewButtons() {
    setClass(edgeTransitionButton, 'active', gridView.edgeTransitionMode);
    setClass(edgeTransitionAnimationButton, 'active', gridView.edgeTransitionAnimationMode);
}

// This should only be called once when initially loading.
function loadData() {
    userData = undefined;
    try {
        userData = JSON.parse(localStorage['userData']);
    // eslint-disable-next-line no-empty
    } catch (e) {
    }

    if (!userData || !userData.code) {
        userData = { code: '.'.repeat(getCodeLength(2) + 1) };
    }

    userData.delay = userData.delay ?? 250;

    if (userData.edgeTransitionMode !== undefined) {
        gridView.edgeTransitionMode = userData.edgeTransitionMode;
    }

    if (userData.edgeTransitionAnimationMode !== undefined) {
        gridView.edgeTransitionAnimationMode = userData.edgeTransitionAnimationMode;
    }

    updateInputModeButtons();
    updateInputTextArea();
    updateSpeedSlider();
}

function loadDataFromURL() {
    let newData = undefined;
    try {
        if (location.hash) {
            newData = JSON.parse(LZString.decompressFromBase64(location.hash.slice(1)));
        }
    // eslint-disable-next-line no-empty
    } catch (e) {
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
    }
}

function generateLink() {
    const urlData = { code: userData.code, input: userData.input, inputMode: userData.inputMode };
    const json = JSON.stringify(urlData);
    // Disable button, until the code changes.
    generateLinkButton.disabled = true;
    urlExportText.value = `${location.origin}/#${LZString.compressToBase64(json)}`;
}

function copyLink() {
    generateLink();
    urlExportText.select();
    document.execCommand("copy");
}

function saveViewState() {
    userData.edgeTransitionMode = gridView.edgeTransitionMode;
    userData.edgeTransitionAnimationMode = gridView.edgeTransitionAnimationMode;
    saveData();
}

function saveData() {
    localStorage['userData'] = JSON.stringify(userData);
}

function onStart() {
    const isEdgeTransition = stepHelper();
    if (isRunning() && !isTerminated()) {
        const delay = isEdgeTransition ? RECENTER_ANIMATION_DURATION : userData.delay;
        gridView.timeoutID = window.setTimeout(onStart, delay);
        // Update buttons after toggling isPlaying state.
        updateButtons();
    }
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

function edgeEventHandler(edgeName) {
    if (gridView.edgeTransitionAnimationMode && edgeName in gridView.edgeConnectors) {
        isEdgeTransition = true;
        const connector = gridView.edgeConnectors[edgeName];
        connector.classList.add('connector_flash');
        gridView.activeHexagon = connector.next;
        const x = gridView.offsets[gridView.activeHexagon][0] * gridView.globalOffsetX;
        const y = gridView.offsets[gridView.activeHexagon][1] * gridView.globalOffsetY;
        puzzleParent.style.transform = `matrix(1,0,0,1,${-x - gridView.fullWidth/4},${-y - gridView.fullHeight/4})`;
        puzzleParent.style['transition-property'] = 'transform';
    }
}

function stepHelper() {
    if (isTerminated()) {
        return;
    }

    if (hexagony == null) {
        hexagony = new Hexagony(gridView.sourceCode, getInput(), edgeEventHandler);
    }

    isEdgeTransition = false;

    hexagony.step();
    [gridView.activeI, gridView.activeJ] = hexagony.grid.axialToIndex(hexagony.coords);
    gridView.updateActiveCell(true, isTerminated());

    outputBox.textContent = hexagony.output;
    outputBox.scrollTop = outputBox.scrollHeight;

    executedCountText.textContent = `Instructions Executed: ${hexagony.ticks}`;
    terminationReasonText.textContent = hexagony.getTerminationReason();
    updateIPStateText();
    updateButtons();
    updateMemorySVG(hexagony, memoryPanZoom);
    return isEdgeTransition;
}

function updateIPStateText() {
    let text = '';
    for (let i = 0; i < 6; i++) {
        const [coords, dir] = hexagony.getIPState(i);
        const isActive = hexagony.activeIp == i ? ' (active)' : '';
        text += `<p>IP #${i}: (${coords}) ${dir}${isActive}`;
    }
    ipStateText.innerHTML = text;
}

function resizeCode(size) {
    const oldCode = removeWhitespaceAndDebug(gridView.sourceCode);
    const oldSize = getHexagonSize(countCodepoints(oldCode));
    let newCode = '';

    if (size > oldSize) {
        let iterator = oldCode[Symbol.iterator]();
        for (let i = 0; i < getRowCount(oldSize); i++) {
            for (let j = 0; j < getRowSize(oldSize, i); j++) {
                newCode += iterator.next().value || '.';
            }

            newCode += '.'.repeat(getRowSize(size, i) - getRowSize(oldSize, i));
        }
    } else {
        let iterator = oldCode[Symbol.iterator]();
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
    let newCode = resizeCode(gridView.size - 1);
    if (countOperators(gridView.sourceCode) == countOperators(newCode) ||
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

function updateInfo() {
    const code = gridView.sourceCode;
    const filteredCode = removeWhitespaceAndDebug(code);
    const filteredCodepoints = countCodepoints(filteredCode);
    hexagonSizeText.textContent = getHexagonSize(filteredCodepoints);
    charCountText.textContent = countCodepoints(code);
    byteCountText.textContent = countBytes(code);
    operatorCountText.textContent = countOperators(filteredCode);
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
    gridView.clearCellExecutionColors();
    gridView.resetPuzzleParent();
    gridView.activeHexagon = 0;
    updateButtons();
    onPause();
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

document.addEventListener('keydown', function(e) {
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
                gridView.undo();
                e.preventDefault();
            }
        }
        else if (e.key == 'y') {
            if (e.target != inputBox) {
                gridView.redo();
                e.preventDefault();
            }
        }
    }
    // console.log(`keydown ${e.key} ${e.ctrlKey} ${e.shiftKey} ${e.altKey} ${Object.keys(e)}`);
});

function init() {
    gridView = new GridView(updateCode, updateButtons);
    loadData();
    loadDataFromURL();
    sourceCodeInput.addEventListener('input', () => updateFromSourceCode(false));
    inputBox.addEventListener('input', onInputChanged);
    setSourceCode(userData.code, true);

    resetButton.addEventListener('click', () => { if (!isRunning()) reset(gridView.size); });
    biggerButton.addEventListener('click', () => { if (!isRunning()) resize(gridView.size + 1); });
    smallerButton.addEventListener('click', () => { if (!isRunning()) onShrink();});
    undoButton.addEventListener('click', () => { if (gridView.canUndo(isRunning())) gridView.undo(); });
    redoButton.addEventListener('click', () => { if (gridView.canRedo(isRunning())) gridView.redo(); });

    startButton.addEventListener('click', onStart);
    stepButton.addEventListener('click', onStep);
    stopButton.addEventListener('click', onStop);
    pauseButton.addEventListener('click', onPause);
    minifyButton.addEventListener('click', () => setSourceCode(minifySource(gridView.sourceCode)));
    layoutButton.addEventListener('click', () => setSourceCode(layoutSource(gridView.sourceCode)));
    generateLinkButton.addEventListener('click', generateLink);
    copyLinkButton.addEventListener('click', copyLink);

    inputArgumentsRadioButton.addEventListener('change', onInputModeChanged);
    inputRawRadioButton.addEventListener('change', onInputModeChanged);
    speedSlider.addEventListener('input', onSpeedSliderChanged);

    edgeTransitionButton.addEventListener('click', () => {
        gridView.edgeTransitionMode = !gridView.edgeTransitionMode;
        if (!gridView.edgeTransitionMode) {
            gridView.edgeTransitionAnimationMode = false;
        }
        gridView.recreateGrid(hexagony != null ? hexagony.getExecutedGrid() : null);
        updateViewButtons();
        saveViewState();
    });

    edgeTransitionAnimationButton.addEventListener('click', () => {
        gridView.edgeTransitionAnimationMode = !gridView.edgeTransitionAnimationMode;
        if (gridView.edgeTransitionAnimationMode) {
            gridView.edgeTransitionMode = true;
        }
        gridView.recreateGrid(hexagony != null ? hexagony.getExecutedGrid() : null);
        updateViewButtons();
        saveViewState();
    });

    updateButtons();
    updateViewButtons();

    puzzleParent.addEventListener('transitionend', (e) => {
        if (e.target == puzzleParent && isRunning()) {
            // Recenter the hexagons after animating their transition.
            // This allows the grid in edge transition animatino mode to appear inifinite.
            gridView.resetPuzzleParent();
            gridView.activeHexagon = 0;
            gridView.updateActiveCell(false);
        }
    });

    // panzoom(document.querySelector('#puzzle_parent'), { filterKey: () => true });
    memoryPanZoom = panzoom(document.querySelector('#memory_svg'), { filterKey: () => true });
    onhashchange = loadDataFromURL;
    initFinished = true;
}

init();
