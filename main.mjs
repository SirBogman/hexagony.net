import { Hexagony } from './hexagony/hexagony.mjs';
import { countBytes, countCodepoints, countOperators, getCodeLength, getHexagonSize, getRowCount, getRowSize, layoutSource, minifySource, removeWhitespaceAndDebug } from './hexagony/util.mjs';
import { createGrid, GridView } from './view/gridview.mjs';
import { updateMemorySVG } from './view/memoryview.mjs';
// import { $ } from 'jquery';
// import { panzoom } from 'panzoom';

function updateCode(code) {
    user_data.code = code;
    $('#sourcecode').val(code);
    saveData();
    resetHexagony();
    updateInfo();
}

let gridView = new GridView(updateCode);
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
    if (isRunning) {
        gridView.timeoutID = window.setTimeout(onStart, isEdgeTransition ? 1000 : 300);
    }
}

function onStep() {
    stepHelper();
    onPause();
}

function stepHelper() {
    if (hexagony == null) {
        let input = $('#input').val().replaceAll(/\n/g, '\0');
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
        $('#puzzle_parent').css({transform: `matrix(1,0,0,1,${-x - gridView.fullWidth/4},${-y - gridView.fullHeight/4})`, 'transition-property': 'transform'});
        gridView.nextEdgeConnectorAnimation = null;
    }

    [gridView.activeI, gridView.activeJ] = hexagony.grid.axialToIndex(hexagony.coords);
    hexagony.step();
    gridView.updateActiveCell(true);
    $('#output').html(hexagony.output);
    $('#stepcount').html(hexagony.ticks);
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

function onShrink() {
    let newCode = resizeCode(gridView.size - 1);
    if (countOperators(gridView.sourceCode) == countOperators(newCode) ||
        confirm('Shrink the hexagon? Code may be lost and this cannot be undone.')) {
        resize(Math.max(1, gridView.size - 1));
    }
}

function resize(size) {
    const p1 = performance.now();
    setSourceCode(resizeCode(size));
    const p2 = performance.now();
    console.log(`resize ${size} took ${p2 - p1}`);
}

function reset(size) {
    setSourceCode('.'.repeat(getCodeLength(size - 1) + 1));
}

function setSourceCode(newCode, isProgrammatic=false) {
    $('#sourcecode').val(newCode);
    updateFromSourceCode(true, isProgrammatic);
}

function updateInfo() {
    const code = gridView.sourceCode;
    const filteredCode = removeWhitespaceAndDebug(code);
    const filteredCodepoints = countCodepoints(filteredCode);
    $('#hexagon_size').html(getHexagonSize(filteredCodepoints));
    $('#char_count').html(countCodepoints(code));
    $('#byte_count').html(countBytes(code));
    $('#operator_count').html(countOperators(filteredCode));
}

function updateFromSourceCode(isProgrammatic=false) {
    let code = $('#sourcecode').val();
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
        createGrid(gridView, newSize);
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
        gridView.oldActiveCell.removeClass('cell_active');
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

function updateButtons() {
    const running = isRunning();
    $('.edit_button').prop('disabled', running);
    $('#start').prop('disabled', gridView.timeoutID != null);
    // TODO: use stop button to explicitly go back to edit mode.
    $('#stop').prop('disabled', !running);
    $('#pause').prop('disabled', gridView.timeoutID == null);

    if (running) {
        $('.play_content').removeClass('hidden_section');
        $('.edit_content').addClass('hidden_section');
        $('#grid_container').removeClass('edit_grid');
        $('#grid_container').addClass('play_grid');
    }
    else {
        $('.play_content').addClass('hidden_section');
        $('.edit_content').removeClass('hidden_section');
        $('#grid_container').addClass('edit_grid');
        $('#grid_container').removeClass('play_grid');
    }
}

function init() {
    loadData();
    $('#sourcecode').on('input propertychange', updateFromSourceCode);
    setSourceCode(user_data.code, true);

    $('#reset').on('click', () => {
        if (confirm('Remove all code from the hexagon? This cannot be undone.')) {
            reset(gridView.size);
        }
    });

    $('#bigger').on('click', () => resize(gridView.size + 1));
    $('#smaller').on('click', onShrink);
    $('#start').on('click', onStart);
    $('#step').on('click', onStep);
    $('#stop').on('click', onStop);
    $('#pause').on('click', onPause);
    $('#minify').on('click', function() {
        setSourceCode(minifySource(gridView.sourceCode));
    });
    $('#layout').on('click', function() {
        setSourceCode(layoutSource(gridView.sourceCode));
    });

    $('#undo').on('click', () => gridView.undo());
    $('#redo').on('click', () => gridView.redo());

    updateButtons();

    $('#puzzle_parent').on('transitionend', function(e) {
        if (e.target == this) {
            $(this).css({transform: `matrix(1,0,0,1,${-gridView.fullWidth/4},${-gridView.fullHeight/4})`, 'transition-property': 'none'});
            gridView.activeHexagon = 0;
            gridView.updateActiveCell(false);
        }
    });

    // panzoom(document.querySelector('#puzzle_parent'), { filterKey: () => true });
    memoryPanZoom = panzoom(document.querySelector('#memory_svg'), { filterKey: () => true });
}

$(init);

$(document).on('keydown', function(e) {
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
