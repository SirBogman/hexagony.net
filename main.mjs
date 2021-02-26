import { Hexagony } from './hexagony/hexagony.mjs';
import { countCodepoints, countOperators, getCodeLength, getHexagonSize, getRowCount, getRowSize, layoutSource, minifySource, removeWhitespaceAndDebug } from './hexagony/util.mjs';
import { createGrid, updateHexagonWithCode } from './view/gridview.mjs'
import { updateMemorySVG } from './view/memoryview.mjs'

let gridState = {
    cellPaths: [],
    cellInput: [],
    edgeConnectors: {},
    offsets: [],
    globalOffsetX: 0,
    globalOffsetY: 0,
    nextEdgeConnectorAnimation: null,
    activeHexagon: 0,
    activeI: 0,
    activeJ: 0,
    oldActiveCell: null,
    size: -1,
    rowCount: -1,
    timeoutID: null,
    fullWidth: 0,
    fullHeight: 0,
    sourceCode: null,
    undoStack: [],
    redoStack: [],
    isUndoRedoInProgress: false,
    updateCode: function(code) {
        user_data.code = code;
        $('#sourcecode').val(code);
        saveData();
        if (this.sourceCode != code) {
            this.sourceCode = code;
            resetHexagony();
        }
    },
    updateUndoButtons: function() {
        $('#undo').prop('disabled', this.undoStack.length == 0);
        $('#redo').prop('disabled', this.redoStack.length == 0);
    },
    undo: function() {
        if (this.undoStack.length) {
            let undoItem = this.undoStack.pop();
            this.redoStack.push(undoItem);
            this.isUndoRedoInProgress = true;
            try {
                undoItem.undo();
            }
            finally {
                this.isUndoRedoInProgress = false;
            }
            this.updateUndoButtons();
        }
    },
    redo: function() {
        if (this.redoStack.length) {
            let undoItem = this.redoStack.pop();
            this.undoStack.push(undoItem);
            this.isUndoRedoInProgress = true;
            try {
                undoItem.redo();
            }
            finally {
                this.isUndoRedoInProgress = false;
            }
            this.updateUndoButtons();
        }
    },
    pushUndoItem: function(undoFunction, redoFunction) {
        if (!this.isUndoRedoInProgress) {
            this.undoStack.push({
                undo: undoFunction,
                redo: redoFunction
            });
            this.redoStack = [];
            this.updateUndoButtons();
        }
    }
};

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
        user_data = { code: '.'.repeat(getCodeLength(3)) };
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
    gridState.nextEdgeConnectorAnimation = edgeName;
}

function resetHexagony() {
    hexagony = null;
    gridState.nextEdgeConnectorAnimation = null;
    gridState.activeHexagon = 0;
}

function updateActiveCell(gridState, transition) {
    const activeCell = gridState.cellPaths[gridState.activeHexagon][gridState.activeI][gridState.activeJ];

    if (gridState.oldActiveCell != activeCell) {
        if (gridState.oldActiveCell != null) {
            $(gridState.oldActiveCell).css('transition-property', transition ? 'fill': 'none');
            $(gridState.oldActiveCell).removeClass('cell_active');
        }
        $(activeCell).css('transition-property', transition ? 'fill': 'none');
        $(activeCell).addClass('cell_active');
        gridState.oldActiveCell = activeCell;
    }
}

function onStart() {
    const isEdgeTransition = stepHelper();
    if (isRunning) {
        gridState.timeoutID = window.setTimeout(onStart, isEdgeTransition ? 1000 : 300);
    }
}

function onStep() {
    stepHelper();
    onPause();
}

function stepHelper() {
    if (hexagony == null) {
        let input = $('#input').val().replaceAll(/\n/g, '\0');
        hexagony = new Hexagony(gridState.sourceCode, input, edgeEventHandler);
    }

    let isEdgeTransition = false;
    if (gridState.nextEdgeConnectorAnimation &&
            gridState.nextEdgeConnectorAnimation in gridState.edgeConnectors) {
        isEdgeTransition = true;
        const $connector = gridState.edgeConnectors[gridState.nextEdgeConnectorAnimation];
        $connector.addClass('connector_flash');
        gridState.activeHexagon = $connector.data('next');
        const x = gridState.offsets[gridState.activeHexagon][0] * gridState.globalOffsetX;
        const y = gridState.offsets[gridState.activeHexagon][1] * gridState.globalOffsetY;
        $('#puzzle_parent').css({transform: `matrix(1,0,0,1,${-x - gridState.fullWidth/4},${-y - gridState.fullHeight/4})`, 'transition-property': 'transform'});
        gridState.nextEdgeConnectorAnimation = null;
    }

    [gridState.activeI, gridState.activeJ] = hexagony.grid.axialToIndex(hexagony.coords);
    hexagony.step();
    updateActiveCell(gridState, true);
    $('#output').html(hexagony.output);
    $('#stepcount').html(hexagony.ticks);
    updateButtons();
    updateMemorySVG(hexagony, memoryPanZoom);
    return isEdgeTransition;
}

function resizeCode(size) {
    const oldCode = gridState.sourceCode;
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

function onShrink() {
    let newCode = resizeCode(gridState.size - 1);
    if (countOperators(gridState.sourceCode) == countOperators(newCode) ||
        confirm('Shrink the hexagon? Code may be lost and this cannot be undone.')) {
        resize(Math.max(1, gridState.size - 1));
    }
}

function resize(size) {
    setSourceCode(resizeCode(size));
}

function reset(size) {
    setSourceCode('.'.repeat(getCodeLength(size - 1) + 1));
}

function setSourceCode(newCode, isProgrammatic=false) {
    $('#sourcecode').val(newCode);
    updateFromSourceCode(true, isProgrammatic);
}

function updateFromSourceCode(isProgrammatic=false) {
    let code = $('#sourcecode').val();
    user_data.code = code;

    if (isProgrammatic != true) {
        saveData();
    }

    if (gridState.sourceCode != code) {
        gridState.sourceCode = code;
        resetHexagony();
    }

    code = removeWhitespaceAndDebug(code);

    const newSize = getHexagonSize(countCodepoints(code));
    if (newSize != gridState.size) {
        createGrid(gridState, newSize);
    }

    for (let k = 0; k < gridState.cellPaths.length; k++) {
        updateHexagonWithCode(gridState, k, code);
    }
}

function onPause() {
    if (gridState.timeoutID != null) {
        window.clearTimeout(gridState.timeoutID);
        gridState.timeoutID = null;
        updateButtons();
    }
}

function onStop() {
    if (gridState.oldActiveCell != null) {
        gridState.oldActiveCell.removeClass('cell_active');
    }
    resetHexagony();
    onPause();
    updateButtons();
}

function isPlaying() {
    return gridState.timeoutID != null;
}

function isRunning() {
    return hexagony != null && hexagony.isRunning;
}

function updateButtons() {
    const running = isRunning();
    $('.edit_button').prop('disabled', running);
    $('#start').prop('disabled', gridState.timeoutID != null);
    $('#stop').prop('disabled', !running);
    $('#pause').prop('disabled', gridState.timeoutID == null);
}

function init() {
    loadData();
    $('#sourcecode').bind('input propertychange', updateFromSourceCode);
    setSourceCode(user_data.code, true);

    $('#reset').click(() => {
        if (confirm('Remove all code from the hexagon? This cannot be undone.')) {
            reset(gridState.size);
        }
    });

    $('#bigger').click(() => resize(gridState.size + 1));
    $('#smaller').click(onShrink);
    $('#start').click(onStart);
    $('#step').click(onStep);
    $('#stop').click(onStop);
    $('#pause').click(onPause);
    $('#minify').click(function() {
        setSourceCode(minifySource(gridState.sourceCode));
    });
    $('#layout').click(function() {
        setSourceCode(layoutSource(gridState.sourceCode));
    });

    $('#undo').click(() => gridState.undo());
    $('#redo').click(() => gridState.redo());

    updateButtons();

    $('#puzzle_parent').on('transitionend', function(e) {
        if (e.target == this) {
            $(this).css({transform: `matrix(1,0,0,1,${-gridState.fullWidth/4},${-gridState.fullHeight/4})`, 'transition-property': 'none'});
            gridState.activeHexagon = 0;
            updateActiveCell(gridState, false);
        }
    });

    // panzoom(document.querySelector('#puzzle_parent'), { filterKey: () => true });
    memoryPanZoom = panzoom(document.querySelector('#memory_svg'), { filterKey: () => true });
}

$(document).ready(init);

$(document).keydown(function(e) {
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
                console.log(`onpause`);
                onPause();
            }
            else {
                onStart();
            }
        }
        else if (e.key == 'z') {
            gridState.undo();
            e.preventDefault();
        }
        else if (e.key == 'y') {
            gridState.redo();
            e.preventDefault();
        }
    }
    //console.log(`keydown ${e.key} ${e.ctrlKey} ${e.shiftKey} ${e.altKey} ${Object.keys(e)}`);
});

// Keys:
// Up/Down arrows: Navigate on the NE-SW axis.
// Shift + Up/Down arrows: Navigate on the NW-SE axis.
// Left/Right arrows: Navigate on the W-E axis.