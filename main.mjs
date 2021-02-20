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
    cellInput[i][j].focus();
    cellInput[i][j].select();
}

function checkArrowKeys(elem, event) {
    if (event) {
        const matches = $(elem).attr('id').match(/\d+/g);
        let i = parseInt(matches[0]);
        let j = parseInt(matches[1]);

        if (event.key == 'F9') {
            let path = cellPaths[i][j];
            path.addClass('cell_breakpoint');
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
            dj = -1;
        } else if (event.key == 'ArrowUp') {
            di = -1;
        } else if (event.key == 'ArrowRight') {
            dj = 1;
        } else if (event.key == 'ArrowDown') {
            di = 1;
        }
        if (di != 0 || dj != 0) {
            let newI = i + di;
            let newJ = j + dj;
            if (newI >= 0 && newI < cellInput.length &&
                newJ >= 0 && newJ < cellInput[newI].length) {
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
    const fullWidth = cellWidth * rowCount + padding;
    const fullHeight = cellOffsetY * rowCount + 1 * (cellHeight - cellOffsetY) + padding;
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
    for (let i = 0; i < rowCount; i++) {
        let pathRow = [];
        let cellRow = [];
        for (let j = 0; j < getRowSize(size, i); j++) {
            let $cell = $template.clone();
            pathRow.push($cell);
            const cellX = getX(size, i, j);
            const cellY = getY(size, i, j);
            $cell.attr({ transform: `translate(${cellX},${cellY})scale(${radius / 20})`, id: `path_${i}_${j}` });
            $parent.append($cell);

            let text = $(document.createElement('input'));
            cellRow.push(text);
            text.attr({ type: 'text', class: 'cell_input', maxlength: 1, id: `input_${i}_${j}` });
            text.css({ left: `${cellX}px`, top: `${cellY}px` });
            text.val('.');
            textParent.append(text);
        }
        cellPaths.push(pathRow);
        cellInput.push(cellRow);
    }

    $('.cell_input').change(function() {
        console.log('chainge');
    });
    
    $('.cell_input').keydown(function(e) {
        checkArrowKeys(this, e);
    });
    
    $('.cell_input').keyup(function() {
        updateFromHexagons();
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
        const matches = this.id.match(/\d+/g);
        const input = cellInput[matches[0]][matches[1]];
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
    const activeCell = cellPaths[i][j];

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
}

function reset(size) {
    $('#sourcecode').val('.'.repeat(getCodeLength(size - 1) + 1));
    updateFromSourceCode();
}

function updateFromSourceCode(isProgrammatic) {
    let code = $('#sourcecode').val();
    user_data.code = code;

    if (!isProgrammatic) {
        saveData();
    }

    if (sourceCode != code) {
        sourceCode = code;
        hexagony = null;
    }

    code = removeWhitespace(code);

    const newSize = getHexagonSize(code.length);
    console.log(`len: ${code.length} ns: ${newSize}`);
    if (newSize != size) {
        createGrid(newSize);
    }

    let k = 0;
    for (let i = 0; i < rowCount; i++) {
        for (let j = 0; j < getRowSize(size, i); j++) {
            let v = k < code.length ? code[k] : '.';
            cellInput[i][j].val(v);
            k++;
        }
    }
}

function updateFromHexagons() {
    let code = '';
    for (let i = 0; i < rowCount; i++) {
        for (let j = 0; j < getRowSize(size, i); j++) {
            const v = cellInput[i][j].val();
            code += v || '.';
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

function init() {
    loadData();
    $('#sourcecode').val(user_data.code);
    $('#sourcecode').bind('input propertychange', updateFromSourceCode);
    updateFromSourceCode(true);

    $('#reset').click(() => reset(size));
    $('#bigger').click(() => reset(size + 1));
    $('#smaller').click(() => reset(Math.max(1, size - 1)));
    $('#step').click(onStep); 
}

$(document).ready(init);

$(document).keydown(function(e) {
    if (e.key == 'F10') {
        onStep();
        e.preventDefault();
        return true;
    }
});
