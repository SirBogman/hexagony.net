import { Hexagony } from './hexagony/hexagony.mjs';
import { countBytes, countCodepoints, countOperators, getCodeLength, getHexagonSize, getRowCount, getRowSize, layoutSource, minifySource, removeWhitespaceAndDebug } from './hexagony/util.mjs';
import { GridView } from './view/gridview.mjs';
import { updateMemorySVG } from './view/memoryview.mjs';
import { setClass, setDisabledClass } from './view/viewutil.mjs';

import { LZString } from './lz-string.min.js';

// import { panzoom } from 'panzoom';

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

const minifyButton = document.querySelector('#minify');
const layoutButton = document.querySelector('#layout');
const updateUrlButton = document.querySelector('#update_url');
const editButtons = [minifyButton, layoutButton];

const edgeTransitionButton = document.querySelector('#edge_transition');
const edgeTransitionAnimationButton = document.querySelector('#edge_transition_animation');

let gridView;
let hexagony;
let user_data;
let memoryPanZoom;
let initFinished = false;

function updateCode(code, isProgrammatic=false) {
    user_data.code = code;
    sourceCodeInput.value = code;
    if (!isProgrammatic && initFinished) {
        saveData();
    }
    resetHexagony();
    updateInfo();
    updateUrlButton.disabled = false;
}

function updateButtons() {
    // TODO: use stop button to explicitly go back to edit mode.
    const running = isRunning();
    editButtons.forEach(x => x.disabled = running);
    editPseudoButtons.forEach(x => setDisabledClass(x, running));

    setDisabledClass(undoButton, running || gridView.undoStack.length == 0);
    setDisabledClass(redoButton, running || gridView.redoStack.length == 0);

    setDisabledClass(startButton, gridView.timeoutID != null);
    setDisabledClass(stopButton, !running);
    setDisabledClass(pauseButton, gridView.timeoutID == null);

    const gridContainer = document.querySelector('#grid_container');

    if (running) {
        document.querySelectorAll('.play_content').forEach(x => x.classList.remove('hidden_section'));
        document.querySelectorAll('.edit_content').forEach(x => x.classList.add('hidden_section'));
        gridContainer.classList.replace('edit_grid', 'play_grid');
    }
    else {
        document.querySelectorAll('.play_content').forEach(x => x.classList.add('hidden_section'));
        document.querySelectorAll('.edit_content').forEach(x => x.classList.remove('hidden_section'));
        gridContainer.classList.replace('play_grid', 'edit_grid');
    }
}

function updateViewButtons() {
    setClass(edgeTransitionButton, 'active', gridView.edgeTransitionMode);
    setClass(edgeTransitionAnimationButton, 'active', gridView.edgeTransitionAnimationMode);
}

// This should only be called once when initially loading.
function loadData() {
    user_data = undefined;
    try {
        user_data = JSON.parse(localStorage['user_data']);
    // eslint-disable-next-line no-empty
    } catch (e) {
    }

    if (!user_data || !user_data.code) {
        user_data = { code: '.'.repeat(getCodeLength(2) + 1) };
    }

    if (user_data.edgeTransitionMode !== undefined) {
        gridView.edgeTransitionMode = user_data.edgeTransitionMode;
    }

    if (user_data.edgeTransitionAnimationMode !== undefined) {
        gridView.edgeTransitionAnimationMode = user_data.edgeTransitionAnimationMode;
    }

    (onhashchange = () => {
        let newData = undefined;
        try {
            if (location.hash) {
                newData = JSON.parse(LZString.decompressFromBase64(location.hash.slice(1)));
            }
        // eslint-disable-next-line no-empty
        } catch (e) {
        }

        if (newData && newData.code) {
            setSourceCode(newData.code, !initFinished);
        }
    })();
}

function updateUrl() {
    const urlData = { code: user_data.code };
    const json = JSON.stringify(urlData);
    history.replaceState(null, '', '#' + LZString.compressToBase64(json));
    // Disable button, until the code changes.
    updateUrlButton.disabled = true;
}

function saveViewState() {
    user_data.edgeTransitionMode = gridView.edgeTransitionMode;
    user_data.edgeTransitionAnimationMode = gridView.edgeTransitionAnimationMode;
    saveData();
}

function saveData() {
    localStorage['user_data'] = JSON.stringify(user_data);
}

function edgeEventHandler(edgeName) {
    gridView.nextEdgeConnectorAnimation = edgeName;
}

function resetHexagony() {
    hexagony = null;
    gridView.nextEdgeConnectorAnimation = null;
    gridView.activeHexagon = 0;
}

function onStart() {
    const isEdgeTransition = stepHelper();
    if (isRunning()) {
        gridView.timeoutID = window.setTimeout(onStart, isEdgeTransition ? 1000 : 300);
    }
}

function onStep() {
    stepHelper();
    onPause();
}

function stepHelper() {
    if (hexagony == null) {
        let input = inputBox.value.replaceAll(/\n/g, '\0');
        hexagony = new Hexagony(gridView.sourceCode, input, edgeEventHandler);
    }

    let isEdgeTransition = false;
    if (gridView.nextEdgeConnectorAnimation &&
            gridView.nextEdgeConnectorAnimation in gridView.edgeConnectors) {
        isEdgeTransition = true;
        const connector = gridView.edgeConnectors[gridView.nextEdgeConnectorAnimation];
        connector.classList.add('connector_flash');
        gridView.activeHexagon = connector.next;
        const x = gridView.offsets[gridView.activeHexagon][0] * gridView.globalOffsetX;
        const y = gridView.offsets[gridView.activeHexagon][1] * gridView.globalOffsetY;

        const puzzleParent = document.querySelector('#puzzle_parent');
        puzzleParent.style.transform = `matrix(1,0,0,1,${-x - gridView.fullWidth/4},${-y - gridView.fullHeight/4})`;
        puzzleParent.style['transition-property'] = 'transform';

        gridView.nextEdgeConnectorAnimation = null;
    }

    [gridView.activeI, gridView.activeJ] = hexagony.grid.axialToIndex(hexagony.coords);
    hexagony.step();
    gridView.updateActiveCell(true);

    const output = document.querySelector('#output');
    output.textContent = hexagony.output;
    output.scrollTop = output.scrollHeight;

    document.querySelector('#stepcount').textContent = hexagony.ticks;
    updateButtons();
    updateMemorySVG(hexagony, memoryPanZoom);
    return isEdgeTransition;
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
    if (gridView.oldActiveCell != null) {
        gridView.oldActiveCell.classList.remove('cell_active');
    }
    resetHexagony();
    onPause();
    updateButtons();
}

function isPlaying() {
    return gridView.timeoutID != null;
}

function isRunning() {
    return hexagony != null && hexagony.isRunning;
}

function init() {
    gridView = new GridView(updateCode, updateButtons);
    loadData();
    sourceCodeInput.addEventListener('input', () => updateFromSourceCode(false));
    sourceCodeInput.addEventListener('propertychange', () => updateFromSourceCode(false));
    setSourceCode(user_data.code, true);

    resetButton.addEventListener('click', () => { if (!isRunning()) reset(gridView.size); });
    biggerButton.addEventListener('click', () => { if (!isRunning()) resize(gridView.size + 1); });
    smallerButton.addEventListener('click', () => { if (!isRunning()) onShrink();});
    undoButton.addEventListener('click', () => { if (!isRunning()) gridView.undo(); });
    redoButton.addEventListener('click', () => { if (!isRunning()) gridView.redo(); });

    startButton.addEventListener('click', onStart);
    stepButton.addEventListener('click', onStep);
    stopButton.addEventListener('click', onStop);
    pauseButton.addEventListener('click', onPause);
    minifyButton.addEventListener('click', () => setSourceCode(minifySource(gridView.sourceCode)));
    layoutButton.addEventListener('click', () => setSourceCode(layoutSource(gridView.sourceCode)));
    updateUrlButton.addEventListener('click', () => updateUrl());

    edgeTransitionButton.addEventListener('click', () => {
        gridView.edgeTransitionMode = !gridView.edgeTransitionMode;
        if (!gridView.edgeTransitionMode) {
            gridView.edgeTransitionAnimationMode = false;
        }
        gridView.recreateGrid();
        updateViewButtons();
        saveViewState();
    });

    edgeTransitionAnimationButton.addEventListener('click', () => {
        gridView.edgeTransitionAnimationMode = !gridView.edgeTransitionAnimationMode;
        if (gridView.edgeTransitionAnimationMode) {
            gridView.edgeTransitionMode = true;
        }
        gridView.recreateGrid();
        updateViewButtons();
        saveViewState();
    });

    updateButtons();
    updateViewButtons();

    const puzzleParent = document.querySelector('#puzzle_parent');
    puzzleParent.addEventListener('transitionend', (e) => {
        if (e.target == puzzleParent) {
            gridView.resetPuzzleParent();
            gridView.activeHexagon = 0;
            gridView.updateActiveCell(false);
        }
    });

    // panzoom(document.querySelector('#puzzle_parent'), { filterKey: () => true });
    memoryPanZoom = panzoom(document.querySelector('#memory_svg'), { filterKey: () => true });
    initFinished = true;
}

init();

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
            gridView.undo();
            e.preventDefault();
        }
        else if (e.key == 'y') {
            gridView.redo();
            e.preventDefault();
        }
    }
    //console.log(`keydown ${e.key} ${e.ctrlKey} ${e.shiftKey} ${e.altKey} ${Object.keys(e)}`);
});
