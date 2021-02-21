import {east, northEast, southEast} from './direction.mjs';
import {Hexagony} from './hexagony.mjs';
import {PointAxial} from './pointaxial.mjs';
import {getCodeLength, getHexagonSize, getRowCount, getRowSize, minify, removeWhitespaceAndDebug} from './util.mjs';

let cellPaths = [];
let cellInput = [];
let hexagony = null;
let sourceCode = null;
let oldActiveCell = null;
let size = -1;
let rowCount = -1;
let user_data;
let timeoutID = null;

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

function outlineHelper(x1, y1, x2, y2) {
    return `l ${x1} ${y1}` + `l ${x2} ${y2} l ${x1} ${y1}`.repeat(size - 1);
}

function indexToAxial(size, rowIndex, columnIndex) {
    return new PointAxial(Math.max(1 - size, -rowIndex) + columnIndex, rowIndex - size + 1);
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
    let $parent = $('#cell_container', $svg);
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
        [-horizontalOffset, -size], // North West
    ];

    let $outlineTemplate = $('defs [class~=outline]', $svg);
    let $connectorTemplate = $('defs [class~=neutral_connector]', $svg);
    let $positiveConnector = $('defs [class~=positive_connector]', $svg);
    let $negativeConnector = $('defs [class~=negative_connector]', $svg);
    let outlines = [];
    let connectors = [];
    let positiveConnectors = [];

    for (let k = 0; k < offsets.length; k++) {
        let pathGrid = [];
        let inputGrid = [];
        for (let i = 0; i < rowCount; i++) {
            let pathRow = [];
            let inputRow = [];
            for (let j = 0; j < getRowSize(size, i); j++) {
                const tooltip = `Coordinates: ${indexToAxial(size, i, j)}`;
                let $cell = $template.clone();
                pathRow.push($cell);
                const cellX = getX(size, i, j) + offsets[k][0] * cellWidth;
                const cellY = getY(size, i, j) + offsets[k][1] * cellOffsetY;
                $cell.attr({ transform: `translate(${cellX},${cellY})scale(${radius / 20})`, id: `path_${i}_${j}_${k}` });
                $cell.find('title').html(tooltip);
                $parent.append($cell);

                let text = $(document.createElement('input'));
                inputRow.push(text);
                text.attr({ type: 'text', class: 'cell_input', maxlength: 1, id: `input_${i}_${j}_${k}`, title: tooltip });
                text.css({ left: `${cellX}px`, top: `${cellY}px` });
                text.val('.');
                textParent.append(text);
            }
            pathGrid.push(pathRow);
            inputGrid.push(inputRow);
        }
        cellPaths.push(pathGrid);
        cellInput.push(inputGrid);

        {
            let $outline = $outlineTemplate.clone();
            let path = `m ${-cellOffsetX} ${-radius/2}` +
                `l ${cellOffsetX} ${-radius / 2} l ${cellOffsetX} ${radius / 2}`.repeat(size) +
                outlineHelper(0, radius, cellOffsetX, radius / 2) +
                outlineHelper(-cellOffsetX, radius / 2, 0, radius) +
                outlineHelper(-cellOffsetX, -radius / 2, -cellOffsetX, radius / 2) +
                outlineHelper(0, -radius, -cellOffsetX, -radius / 2) +
                outlineHelper(cellOffsetX, -radius/2, 0, -radius);

            $outline.attr({ d: path });
            const cellX = getX(size, 0, 0) + offsets[k][0] * cellWidth;
            const cellY = getY(size, 0, 0) + offsets[k][1] * cellOffsetY;
            $outline.attr({ transform: `translate(${cellX},${cellY})scale(${radius / 20})` });
            outlines.push($outline);
        }

        for (let i = 0; i < size; i++) {
            const isSpecial = i == 0 || i == size - 1;
            let $connector, cellX, cellY, scaleX, scaleY;

            // Top edge
            if (offsets[k][1] >= 0) {
                $connector = (isSpecial ? $positiveConnector : $connectorTemplate).clone();
                cellX = getX(size, 0, i) + offsets[k][0] * cellWidth + 0.5 * cellOffsetX;
                cellY = getY(size, 0, i) + offsets[k][1] * cellOffsetY - 0.75 * radius;
                scaleX = radius / 20;
                scaleY = -radius / 20;
                if (i == 0) {
                    cellX -= cellOffsetX;
                    cellY -= cellOffsetY;
                    scaleX *= -1;
                    scaleY *= -1;
                }
                $connector.attr({ transform: `translate(${cellX},${cellY})scale(${scaleX},${scaleY})rotate(60)` });
                (isSpecial ? positiveConnectors : connectors).push($connector);

                $connector = (isSpecial ? $negativeConnector : $connectorTemplate).clone();
                cellX = getX(size, 0, i) + offsets[k][0] * cellWidth + 0.5 * cellOffsetX;
                cellY = getY(size, 0, i) + (offsets[k][1] - 1) * cellOffsetY - 0.75 * radius;
                scaleX = scaleY = -radius / 20;
                if (i == 0) {
                    cellX -= cellOffsetX;
                    cellY += cellOffsetY;
                    scaleX = scaleY *= -1;
                }
                $connector.attr({ transform: `translate(${cellX},${cellY})scale(${scaleX},${scaleY})rotate(240)` });
                connectors.push($connector);
            }

            // North east edge
            if (offsets[k][0] <= 0 && offsets[k][1] >= -size) {
                $connector = (isSpecial ? $positiveConnector : $connectorTemplate).clone();
                cellX = getX(size, i, getRowSize(size, i) - 1) + offsets[k][0] * cellWidth + cellOffsetX;
                cellY = getY(size, i, getRowSize(size, i) - 1) + offsets[k][1] * cellOffsetY;
                scaleX = radius / 20;
                scaleY = -radius / 20;
                if (i == 0) {
                    cellX += cellOffsetX;
                    cellY -= cellOffsetY;
                    scaleX *= -1;
                    scaleY *= -1;
                }
                $connector.attr({ transform: `translate(${cellX},${cellY})scale(${scaleX},${scaleY})` });
                (isSpecial ? positiveConnectors : connectors).push($connector);

                $connector = (isSpecial ? $negativeConnector : $connectorTemplate).clone();
                cellX = getX(size, i, getRowSize(size, i) - 1) + (offsets[k][0] + 1) * cellWidth + 0.5 * cellOffsetX;
                cellY = getY(size, i, getRowSize(size, i) - 1) + offsets[k][1] * cellOffsetY - 0.75 * radius;
                scaleX = scaleY = -radius / 20;
                if (i == 0) {
                    cellX -= cellWidth;
                    scaleX = scaleY *= -1;
                }
                $connector.attr({ transform: `translate(${cellX},${cellY})scale(${scaleX},${scaleY})rotate(300)` });
                connectors.push($connector);
            }

            // South east edge
            if (offsets[k][0] <= 0 && offsets[k][1] <= size) {
                let a = i + size - 1;
                $connector = (isSpecial ? $positiveConnector : $connectorTemplate).clone();
                cellX = getX(size, a, getRowSize(size, a) - 1) + offsets[k][0] * cellWidth + 0.5 * cellOffsetX;
                cellY = getY(size, a, getRowSize(size, a) - 1) + offsets[k][1] * cellOffsetY + 0.75 * radius;
                scaleX = radius / 20;
                scaleY = -radius / 20;
                if (i == 0) {
                    cellX += cellWidth;
                    scaleX *= -1;
                    scaleY *= -1;
                }
                $connector.attr({ transform: `translate(${cellX},${cellY})scale(${scaleX},${scaleY})rotate(300)` });
                (isSpecial ? positiveConnectors : connectors).push($connector);

                $connector = (isSpecial ? $negativeConnector : $connectorTemplate).clone();
                cellX = getX(size, a, getRowSize(size, a) - 1) + (offsets[k][0] + 1) * cellWidth;
                cellY = getY(size, a, getRowSize(size, a) - 1) + (offsets[k][1] + 1) * cellOffsetY;
                scaleX = scaleY = -radius / 20;
                if (i == 0) {
                    cellX -= cellOffsetX;
                    cellY -= cellOffsetY;
                    scaleX = scaleY *= -1;
                }
                $connector.attr({ transform: `translate(${cellX},${cellY})scale(${scaleX},${scaleY})` });
                $parent.append($connector);
            }
        }
    }

    connectors.forEach(x => $parent.append(x));
    positiveConnectors.forEach(x => $parent.append(x));
    outlines.forEach(x => $parent.append(x));

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
        let input = $('#input').val().replaceAll(/\n/g, '\0');
        hexagony = new Hexagony(sourceCode, input);
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
    $('#stepcount').html(hexagony.ticks);
    updateButtons();
    updateMemorySVG();

    if (isRunning) {
        //timeoutID = window.setTimeout(onStep, 100);
    }
}

function updateMemorySVG() {
    let $svg = $('#memory_svg');
    let $lineTemplate = $('defs [class~=memory_cell]', $svg);
    let $mpTemplate = $('defs [class~=memory_pointer]', $svg);
    let $textTemplate = $('defs [class~=memory_text]', $svg);
    let $parent = $('#cell_container', $svg);
    $parent.empty();
    if (hexagony == null) {
        return;
    }

    const padding = 3;
    const xFactor = 20;
    const yFactor = 34;
    const maxX = hexagony.memory.maxX + padding;
    const minX = hexagony.memory.minX - padding;
    const maxY = hexagony.memory.maxY + padding;
    const minY = hexagony.memory.minY - padding;

    $svg.attr({ width: (maxX - minX) * xFactor, height: (maxY - minY) * yFactor });

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
                    string += ` '${String.fromCharCode(Number(value % 256n))}'`;
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
            }
        }
    }
}

function resizeCode(size) {
    const oldCode = sourceCode;
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
    newCode = minify(newCode);
    return newCode;
}

function countCodepoints(code) {
    let count = 0;
    // eslint-disable-next-line no-unused-vars
    for (let _ of code) {
        count++;
    }
    return count;
}

function countOperators(code) {
    let count = 0;
    for (let char of code) {
        if (char != '.') {
            count++;
        }
    }
    return count;
}

function onShrink() {
    let newCode = resizeCode(size - 1);
    if (countOperators(sourceCode) == countOperators(newCode) ||
        confirm('Shrink the hexagon? Code may be lost and this cannot be undone.')) {
        resize(Math.max(1, size - 1));
    }
}

function resize(size) {
    let newCode = resizeCode(size);
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

    code = removeWhitespaceAndDebug(code);

    const newSize = getHexagonSize(countCodepoints(code));
    if (newSize != size) {
        createGrid(newSize);
    }

    for (let k = 0; k < cellInput.length; k++) {
        updateHexagonWithCode(k, code);
    }
}

function updateHexagonWithCode(index, code) {
    let iterator = code[Symbol.iterator]();
    for (let i = 0; i < cellInput[index].length; i++) {
        for (let j = 0; j < cellInput[index][i].length; j++) {
            cellInput[index][i][j].val(iterator.next().value || '.');
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
    if (timeoutID != null) {
        window.clearTimeout(timeoutID);
        timeoutID = null;
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
    $('#sourcecode').val(user_data.code);
    $('#sourcecode').bind('input propertychange', updateFromSourceCode);
    updateFromSourceCode(true);

    $('#reset').click(() => {
        if (confirm('Remove all code from the hexagon? This cannot be undone.')) {
            reset(size);
        }
    });

    $('#bigger').click(() => resize(size + 1));
    $('#smaller').click(onShrink);
    $('#step').click(onStep);
    $('#stop').click(onStop);
    updateButtons();
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