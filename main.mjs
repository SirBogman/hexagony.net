import { Hexagony } from './hexagony/hexagony.mjs';
import { countBytes, countCodepoints, countOperators, getCodeLength, getHexagonSize, getRowCount, getRowSize, layoutSource, minifySource, removeWhitespaceAndDebug } from './hexagony/util.mjs';
import { GridView } from './view/gridview.mjs';
import { updateMemorySVG } from './view/memoryview.mjs';
import { setDisabledClass } from './view/viewutil.mjs';
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
const editButtons = [smallerButton, resetButton, biggerButton];

const startButton = document.querySelector('#start');
const stepButton = document.querySelector('#step');
const pauseButton = document.querySelector('#pause');
const stopButton = document.querySelector('#stop');

function updateCode(code) {
    user_data.code = code;
    sourceCodeInput.value = code;
    saveData();
    resetHexagony();
    updateInfo();
}

function updateButtons() {
    const running = isRunning();
    document.querySelectorAll('.edit_button').forEach(x => setDisabledClass(x, running));
    editButtons.forEach(x => setDisabledClass(x, running));

    setDisabledClass(undoButton, running || gridView.undoStack.length == 0);
    setDisabledClass(redoButton, running || gridView.redoStack.length == 0);

    setDisabledClass(startButton, gridView.timeoutID != null);
    // TODO: use stop button to explicitly go back to edit mode.
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

let gridView = new GridView(updateCode, updateButtons);
let hexagony;
let user_data;
let memoryPanZoom;

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
}

function saveData() {
    try {
        localStorage['user_data'] = JSON.stringify(user_data);
    } catch (e) {
        // No localstorage
    }
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
    const oldCode = gridView.sourceCode;
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
    updateFromSourceCode(true, isProgrammatic);
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
    let code = sourceCodeInput.value;
    user_data.code = code;

    if (isProgrammatic != true) {
        saveData();
    }

    if (gridView.sourceCode != code) {
        gridView.sourceCode = code;
        resetHexagony();
    }

    updateInfo();

    code = removeWhitespaceAndDebug(code);

    const newSize = getHexagonSize(countCodepoints(code));
    if (newSize != gridView.size) {
        gridView.createGrid(newSize);
    }

    for (let k = 0; k < gridView.cellPaths.length; k++) {
        gridView.updateHexagonWithCode(k, code);
    }
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
    loadData();
    sourceCodeInput.addEventListener('input', updateFromSourceCode);
    sourceCodeInput.addEventListener('propertychange', updateFromSourceCode);
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
    document.querySelector('#minify').addEventListener('click', () => setSourceCode(minifySource(gridView.sourceCode)));
    document.querySelector('#layout').addEventListener('click', () => setSourceCode(layoutSource(gridView.sourceCode)));

    updateButtons();

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
