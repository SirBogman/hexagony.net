import {getCodeLength, getHexagonSize, getRowCount, getRowSize, minify, removeWhitespace} from './util.mjs';
import {Hexagony} from './hexagony.mjs';

let cellPaths = [];
let cellInput = [];
let hexagony = null;
let sourceCode = null;
let oldActiveCell = null;
let size = -1;
let rowCount = -1;
let user_data;

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

function navigateTo(i, j) {
    cellInput[0][i][j].focus();
    cellInput[0][i][j].select();
}

function getIndices(elem) {
    return $(elem).attr('id').match(/\d+/g).map(x => parseInt(x));
}

function checkArrowKeys(elem, event) {
    // TOOD: escape to deselect.
    if (event) {
        const [i, j, k] = getIndices(elem);

        if (event.key == 'F9') {
            let path = cellPaths[k][i][j];
            if (path.hasClass('cell_breakpoint')) {
                path.removeClass('cell_breakpoint');
            }
            else {
                path.addClass('cell_breakpoint');
            }
            return true;
        }
        // if (event.key == 'Backspace') {
        //     $(elem).val('.');
        //     if (j) {
        //         navigateTo(i, j - 1);
        //     }
        //     else if (i) {
        //         navigateTo(i - 1, getRowSize(size, i - 1) - 1);
        //     }
        //     event.preventDefault();
        //     return true;
        // }

        let di = 0, dj = 0;
        if (event.key == 'ArrowLeft') {
            if (j > 0) {
                dj = -1;
            } else if (i > 0) {
                navigateTo(i - 1, cellInput[0][i - 1].length - 1);
                event.preventDefault();
                return true;
            } else {
                event.preventDefault();
                return true;
            }
        } else if (event.key == 'ArrowRight') {
            if (j < cellInput[0][i].length - 1) {
                dj = 1;
            } else if (i < cellInput[0].length - 1) {
                navigateTo(i + 1, 0);
                event.preventDefault();
                return true;
            } else {
                event.preventDefault();
                return true;
            }
        } else if (event.key == 'ArrowUp') {
            di = -1;
        } else if (event.key == 'ArrowDown') {
            di = 1;
        }
        if (di != 0 || dj != 0) {
            if (di != 0) {
                if (event.shiftKey) {
                    // Move in a straight line with up and down arrows in the top and bottom half.
                    if (i < size && di < 0) {
                        dj--;
                    }
                    if (i < size - 1 && di > 0) {
                        dj++;
                    }
                } else {
                    if (i >= size && di < 0) {
                        dj++;
                    }
                    if (i >= size - 1 && di > 0) {
                        dj--;
                    }
                }
            }

            let newI = i + di;
            let newJ = j + dj;
            if (newI >= 0 && newI < cellInput[0].length &&
                newJ >= 0 && newJ < cellInput[0][newI].length) {
                navigateTo(newI, newJ);
            }
            // Prevent the selection from being cancelled on key up.
            event.preventDefault();
            return true;
        }
    }
    return false;
}

function createGrid(newSize) {
    size = newSize;
    rowCount = getRowCount(size);
    const radius = 20;
    const cellHeight = radius * 2;
    const cellOffsetY = 3 / 4 * cellHeight;
    const cellOffsetX = Math.sqrt(3) / 2 * radius;
    const cellWidth = cellOffsetX * 2;
    const padding = 10;

    // When showing 6 hexagons around a center hexagon,
    // the "rowCount" below represents the number of rows in the center of one of the side hexagons.
    // the "size" represents the number of rows on the top and bottom edges of the center hexagons.
    // and 1 represents the gap between them.
    const fullWidth = cellWidth * (rowCount * 2 + size + 1) + padding;
    const fullHeight = cellOffsetY * (rowCount * 3 + 3) + padding;
    const centerX = fullWidth / 2;
    const centerY = fullHeight / 2;

    function getX(size, i, j) {
        return centerX +
            (j - size + 1) * cellWidth +
            Math.abs(i - size + 1) * cellOffsetX;
    }

    function getY(size, i) {
        return centerY + (i - size + 1) * cellOffsetY;
    }

    let $svg = $('#puzzle');
    $svg.attr({ width: fullWidth, height: fullHeight });
    let $template = $('defs [class~=cell]', $svg);
    let $parent = $('#cell_container');
    const textParent = $('#input_container');
    $parent.empty();
    textParent.empty();
    cellPaths = [];
    cellInput = [];

    let horizontalOffset = 3 * size / 2;
    let offsets = [
        [0,0], // Center
        [0, -rowCount - 1], // North
        [horizontalOffset, size], // South East
        [horizontalOffset, -size], // North East
        [0, rowCount + 1], // South
        [-horizontalOffset, size], // South East
        [-horizontalOffset, -size], // South West
    ];

    for (let k = 0; k < offsets.length; k++) {
        let pathGrid = [];
        let inputGrid = [];
        for (let i = 0; i < rowCount; i++) {
            let pathRow = [];
            let inputRow = [];
            for (let j = 0; j < getRowSize(size, i); j++) {
                let $cell = $template.clone();
                pathRow.push($cell);
                const cellX = getX(size, i, j) + offsets[k][0] * cellWidth;
                const cellY = getY(size, i, j) + offsets[k][1] * cellOffsetY;
                $cell.attr({ transform: `translate(${cellX},${cellY})scale(${radius / 20})`, id: `path_${i}_${j}_${k}` });
                $parent.append($cell);

                let text = $(document.createElement('input'));
                inputRow.push(text);
                text.attr({ type: 'text', class: 'cell_input', maxlength: 1, id: `input_${i}_${j}_${k}` });
                text.css({ left: `${cellX}px`, top: `${cellY}px` });
                text.val('.');
                textParent.append(text);
            }
            pathGrid.push(pathRow);
            inputGrid.push(inputRow);
        }
        cellPaths.push(pathGrid);
        cellInput.push(inputGrid);
    }

    console.log(`${cellPaths.length} ${cellPaths[0].length} ${cellPaths[0][0].length}`);
    console.log(`${cellInput.length} ${cellInput[0].length} ${cellInput[0][0].length}`);

    $('.cell_input').change(function() {
        console.log('chainge');
    });

    $('.cell_input').keydown(function(e) {
        checkArrowKeys(this, e);
    });

    $('.cell_input').keyup(function() {
        updateFromHexagons(this);
    });

    $('.cell_input').click(function() {
        // Select text when clicking on it.
        $(this).select();
    });

    $('.cell_input').focusout(function() {
        const input = $(this);
        if (!input.val()) {
            input.val('.');
        }
    });

    $('[class~=cell]', $svg).click(function() {
        // Select text when clicking on the background of the cell.
        const [i, j, k] = getIndices(this);
        const input = cellInput[k][i][j];
        input.focus();
        input.select();
    });
}

function onStep() {
    if (hexagony == null) {
        hexagony = new Hexagony(sourceCode, '');
    }

    const [i, j] = hexagony.grid.axialToIndex(hexagony.coords);
    hexagony.step();
    const activeCell = cellPaths[0][i][j];

    if (oldActiveCell != activeCell) {
        if (oldActiveCell != null) {
            $(oldActiveCell).removeClass('cell_active');
        }
        $(activeCell).addClass('cell_active');
        oldActiveCell = activeCell;
    }

    $('#output').val(hexagony.output);
    $('#memory').val(hexagony.memory.debugString + '\n\n' + hexagony.coords + '\n' + hexagony.dir + '\n' + hexagony.grid.getInstruction(hexagony.coords));
    $('#stepcount').html(hexagony.ticks);
    updateButtons();
}

function resize(size) {
    const oldCode = sourceCode;
    const oldSize = getHexagonSize(oldCode.length);
    let newCode = '';

    if (size > oldSize) {
        let m = 0;
        for (let i = 0; i < getRowCount(oldSize); i++) {
            for (let j = 0; j < getRowSize(oldSize, i); j++) {
                const char = m < oldCode.length ? oldCode[m++] : '.';
                newCode += char;
            }

            newCode += '.'.repeat(getRowSize(size, i) - getRowSize(oldSize, i));
        }
    } else {
        let m = 0;
        for (let i = 0; i < getRowCount(size); i++) {
            for (let j = 0; j < getRowSize(size, i); j++) {
                const char = m < oldCode.length ? oldCode[m++] : '.';
                newCode += char;
            }

            m += getRowSize(oldSize, i) - getRowSize(size, i);
        }
    }

    newCode += '.'.repeat(getCodeLength(size) - newCode.length);
    newCode = minify(newCode);
    $('#sourcecode').val(newCode);
    updateFromSourceCode();
}

function reset(size) {
    $('#sourcecode').val('.'.repeat(getCodeLength(size - 1) + 1));
    updateFromSourceCode();
}

function updateFromSourceCode(isProgrammatic) {
    let code = $('#sourcecode').val();
    user_data.code = code;

    if (isProgrammatic != true) {
        saveData();
    }

    if (sourceCode != code) {
        sourceCode = code;
        hexagony = null;
    }

    code = removeWhitespace(code);

    const newSize = getHexagonSize(code.length);
    if (newSize != size) {
        createGrid(newSize);
    }

    for (let k = 0; k < cellInput.length; k++) {
        updateHexagonWithCode(k, code);
    }
}

function updateHexagonWithCode(index, code) {
    let m = 0;
    for (let i = 0; i < cellInput[index].length; i++) {
        for (let j = 0; j < cellInput[index][i].length; j++) {
            let v = m < code.length ? code[m] : '.';
            cellInput[index][i][j].val(v);
            m++;
        }
    }
}

function updateFromHexagons(elem) {
    const hexagonIndex = getIndices(elem)[2];

    let code = '';
    for (let i = 0; i < rowCount; i++) {
        for (let j = 0; j < getRowSize(size, i); j++) {
            const v = cellInput[hexagonIndex][i][j].val();
            code += v || '.';
        }
    }

    for (let k = 0; k < cellInput.length; k++) {
        if (k != hexagonIndex) {
            updateHexagonWithCode(k, code);
        }
    }

    code = minify(code);
    user_data.code = code;
    $('#sourcecode').val(code);
    saveData();
    if (sourceCode != code) {
        sourceCode = code;
        hexagony = null;
    }
}

function onStop() {
    if (oldActiveCell != null) {
        oldActiveCell.removeClass('cell_active');
    }
    hexagony = null;
    updateButtons();
}

function updateButtons() {
    $('.edit_button').prop("disabled", hexagony != null && hexagony.isRunning);
}

function init() {
    loadData();
    $('#sourcecode').val(user_data.code);
    $('#sourcecode').bind('input propertychange', updateFromSourceCode);
    updateFromSourceCode(true);

    $('#reset').click(() => reset(size));
    $('#bigger').click(() => resize(size + 1));
    $('#smaller').click(() => resize(Math.max(1, size - 1)));
    $('#step').click(onStep);
    $('#stop').click(onStop);
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