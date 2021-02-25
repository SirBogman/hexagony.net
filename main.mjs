import { east, northEast, southEast } from './hexagony/direction.mjs';
import { Hexagony } from './hexagony/hexagony.mjs';
import { PointAxial } from './hexagony/pointaxial.mjs';
import { countCodepoints, countOperators, getCodeLength, getHexagonSize, getRowCount, getRowSize, layoutSource, minifySource, removeWhitespaceAndDebug } from './hexagony/util.mjs';
import { createGrid, updateHexagonWithCode } from './view/gridview.mjs'

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
    updateCode: function(code) {
        user_data.code = code;
        $('#sourcecode').val(code);
        saveData();
        if (this.sourceCode != code) {
            this.sourceCode = code;
            resetHexagony();
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

function onStep() {
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
    updateMemorySVG();

    if (isRunning) {
        gridState.timeoutID = window.setTimeout(onStep, isEdgeTransition ? 1000 : 300);
    }
}

function updateMemorySVG() {
    let $container = $('#memory_container');
    let $svg = $('#memory_svg');
    let $lineTemplate = $('defs [class~=memory_cell]', $svg);
    let $mpTemplate = $('defs [class~=memory_pointer]', $svg);
    let $textTemplate = $('defs [class~=memory_text]', $svg);
    let $parent = $('#cell_container', $svg);
    $parent.empty();
    if (hexagony == null) {
        return;
    }

    const padding = 10;
    const xFactor = 20;
    const yFactor = 34;
    const maxX = hexagony.memory.maxX + padding;
    const minX = hexagony.memory.minX - padding;
    const maxY = hexagony.memory.maxY + padding;
    const minY = hexagony.memory.minY - padding;

    $svg.attr({ width: (maxX - minX) * xFactor, height: (maxY - minY) * yFactor });

    const centerX = 0.5 * (maxX - minX) * xFactor;
    const centerY = 0.5 * (maxY - minY) * yFactor;
    //$svg.css({ transform: `matrix(1 0,0,1, ${0.5 * $container.width() - centerX}, ${0.5 * $container.height() - centerY})` });
    //$svg.attr({ transform: `translate(${0.5 * $container.width() - centerX}, ${0.5 * $container.height() - centerY})` });

    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            if (!((y % 2 == 0 && x % 2 == 0) ||
                ((y % 4 + 4) % 4 == 1 && (x % 4 + 4) % 4 == 1) ||
                ((y % 4 + 4) % 4 == 3 && (x % 4 + 4) % 4 == 3))) {
                continue;
            }

            let dir, mp;

            if (y % 2 != 0) {
                dir = east;
                mp = new PointAxial((x - y) / 4, (y - 1) / 2);
            }
            else if ((x - y) % 4 == 0) {
                dir = northEast;
                mp = new PointAxial((x - y) / 4, y / 2);
            }
            else {
                dir = southEast;
                mp = new PointAxial((x - y + 2) / 4, (y - 2) / 2);
            }

            const xx = (x - minX) * xFactor;
            const yy = (y - minY) * yFactor;
            const hasValue = hexagony.memory.hasKey(mp, dir);
            const $line = $lineTemplate.clone();
            let angle = dir == northEast ? 30 : dir == southEast ? -30 : -90;
            $line.attr({ transform: `translate(${xx},${yy})rotate(${angle})` });
            if (hasValue) {
                $line.addClass('memory_value');
            }
            $parent.append($line);

            if (hasValue) {
                const value = hexagony.memory.getValueAt(mp, dir);
                let string = value.toString();

                if (value >= 0x20 && value <= 0xff && value != 0x7f) {
                    string += ` ‘${String.fromCharCode(Number(value % 256n))}’`;
                }

                let $text = $textTemplate.clone();
                $text.find('text').html(string);
                $text.attr({ transform: `translate(${xx},${yy})rotate(${angle})` });
                $parent.append($text);
            }

            if (mp.q == hexagony.memory.mp.q && mp.r == hexagony.memory.mp.r && dir == hexagony.memory.dir) {
                // Add the memory pointer (arrow) showing the position and direction.
                angle = (dir == northEast ? -60 : dir == southEast ? 60 : 0) + (hexagony.memory.cw ? 180 : 0);
                let $pointer = $mpTemplate.clone();
                $pointer.attr({ transform: `translate(${xx},${yy})rotate(${angle})` });
                $parent.append($pointer);
                // TODO: only autoscroll when pointer gets near edges.
                memoryPanZoom.moveTo(0.5 * $container.width() - centerX, 0.5 * $container.height() - centerY);
            }
        }
    }
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

function onStop() {
    if (gridState.oldActiveCell != null) {
        gridState.oldActiveCell.removeClass('cell_active');
    }
    resetHexagony();
    updateButtons();
    if (gridState.timeoutID != null) {
        window.clearTimeout(gridState.timeoutID);
        gridState.timeoutID = null;
    }
}

function isRunning() {
    return hexagony != null && hexagony.isRunning;
}

function updateButtons() {
    const running = isRunning();
    $('.edit_button').prop('disabled', running);
    $('#stop').prop('disabled', !running);
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
    $('#step').click(onStep);
    $('#stop').click(onStop);
    $('#minify').click(function() {
        setSourceCode(minifySource(gridState.sourceCode));
    });
    $('#layout').click(function() {
        setSourceCode(layoutSource(gridState.sourceCode));
    });
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
    if (e.key == 'F10') {
        onStep();
        e.preventDefault();
        return true;
    }
});

// Keys:
// Up/Down arrows: Navigate on the NE-SW axis.
// Shift + Up/Down arrows: Navigate on the NW-SE axis.
// Left/Right arrows: Navigate on the W-E axis.