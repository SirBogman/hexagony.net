import { getRowCount, getRowSize, indexToAxial, minifySource, removeWhitespaceAndDebug } from '../hexagony/util.mjs';
import { emptyElement } from "./viewutil.mjs";

function getIndices(elem) {
    return $(elem).attr('id').match(/\d+/g).map(x => parseInt(x));
}

function outlineHelper(x1, y1, x2, y2, size) {
    return `l ${x1} ${y1}` + `l ${x2} ${y2} l ${x1} ${y1}`.repeat(size - 1);
}

export class GridView {
    constructor(updateCodeCallback) {
        this.updateCodeCallback = updateCodeCallback;
        this.cellPaths = [];
        this.cellInput = [];
        this.edgeConnectors = {};
        this.offsets = [];
        this.globalOffsetX = 0;
        this.globalOffsetY = 0;
        this.nextEdgeConnectorAnimation = null;
        this.activeHexagon = 0;
        this.activeI = 0;
        this.activeJ = 0;
        this.oldActiveCell = null;
        this.size = -1;
        this.rowCount = -1;
        this.timeoutID = null;
        this.fullWidth = 0;
        this.fullHeight = 0;
        this.sourceCode = '';
        this.undoStack = [];
        this.redoStack = [];
        this.isUndoRedoInProgress = false;
        this.activeEditingCell = null;
    }

    updateCode(code) {
        if (this.sourceCode != code) {
            this.sourceCode = code;
            this.updateCodeCallback(code);
        }
    }

    updateUndoButtons() {
        $('#undo').prop('disabled', this.undoStack.length == 0);
        $('#redo').prop('disabled', this.redoStack.length == 0);
    }

    undo() {
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
    }

    redo() {
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
    }

    pushUndoItem(undoFunction, redoFunction) {
        if (!this.isUndoRedoInProgress) {
            this.undoStack.push({
                undo: undoFunction,
                redo: redoFunction
            });
            this.redoStack = [];
            this.updateUndoButtons();
        }
    }

    updateActiveCell(transition) {
        const activeCell = this.cellPaths[this.activeHexagon][this.activeI][this.activeJ];
    
        if (this.oldActiveCell != activeCell) {
            if (this.oldActiveCell != null) {
                $(this.oldActiveCell).css('transition-property', transition ? 'fill': 'none');
                $(this.oldActiveCell).removeClass('cell_active');
            }
            $(activeCell).css('transition-property', transition ? 'fill': 'none');
            $(activeCell).addClass('cell_active');
            this.oldActiveCell = activeCell;
        }
    }

    updateHexagonWithCode(index, code) {
        let iterator = code[Symbol.iterator]();
        for (let i = 0; i < this.cellPaths[index].length; i++) {
            for (let j = 0; j < this.cellPaths[index][i].length; j++) {
                const $cell = $(this.cellPaths[index][i][j]);
                const char = iterator.next().value || '.';
                const input = $cell.data('input');
                if (input) {
                    $(input).val(char);
                    $(input).trigger('select');
                }
                else {
                    const text = $cell.find('text');
                    text.html(char);
                    if (char == '.') {
                        text.addClass('noop');
                    }
                    else {
                        text.removeClass('noop');
                    }
                }
            }
        }
    }

    updateFromHexagons(targetI, targetJ, value, updateActiveHexagon=true) {
        let code = '';
        let oldValue = '.';
    
        let iterator = removeWhitespaceAndDebug(this.sourceCode)[Symbol.iterator]();
        for (let i = 0; i < this.rowCount; i++) {
            for (let j = 0; j < getRowSize(this.size, i); j++) {
                let current = iterator.next().value;
                if (i == targetI && j == targetJ) {
                    oldValue = current;
                    if (oldValue == value) {
                        return;
                    }
                    current = value;
                }
                code += current || '.';
            }
        }
    
        this.pushUndoItem(
            () => this.updateFromHexagons(targetI, targetJ, oldValue),
            () => this.updateFromHexagons(targetI, targetJ, value));
    
        // Assume that currently editing hexagon 0.
        for (let k = updateActiveHexagon ? 0 : 1; k < this.cellPaths.length; k++) {
            this.updateHexagonWithCode(k, code);
        }
    
        this.updateCode(minifySource(code));
    }
}

function checkArrowKeys(gridView, elem, event) {
    // TOOD: escape to deselect.
    const [i, j, k] = getIndices(elem);

    if (event.key == 'b' && event.ctrlKey) {
        let path = gridView.cellPaths[k][i][j];
        if (path.classList.contains('cell_breakpoint')) {
            path.classList.remove('cell_breakpoint');
        }
        else {
            path.classList.add('cell_breakpoint');
        }
        event.preventDefault();
    }
    if (event.key == 'Backspace') {
        // TODO: do nothing if no text selected?
        $(elem).val('.');
        // focusout will apply update.
        if (j) {
            navigateTo(gridView, i, j - 1);
        }
        else if (i) {
            navigateTo(gridView, i - 1, getRowSize(gridView.size, i - 1) - 1);
        }
        else {
            gridView.updateFromHexagons(0, 0, '.', false);
            $(elem).trigger('select');
        }
        event.preventDefault();
        return;
    }
    if (event.key == 'Delete') {
        $(elem).val('.');
        $(elem).trigger('select');
        gridView.updateFromHexagons(0, 0, '.', false);

        event.preventDefault();
        return;
    }

    let di = 0, dj = 0;
    if (event.key == 'ArrowLeft' || event.key == 'Tab' && event.shiftKey) {
        if (j > 0) {
            dj = -1;
        } else if (i > 0) {
            navigateTo(gridView, i - 1, gridView.cellPaths[0][i - 1].length - 1);
            event.preventDefault();
            return;
        } else {
            event.preventDefault();
            return;
        }
    } else if (event.key == 'ArrowRight' || event.key == 'Tab' && !event.shiftKey) {
        if (j < gridView.cellPaths[0][i].length - 1) {
            dj = 1;
        } else if (i < gridView.cellPaths[0].length - 1) {
            navigateTo(gridView, i + 1, 0);
            event.preventDefault();
            return;
        } else {
            event.preventDefault();
            return;
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
                if (i < gridView.size && di < 0) {
                    dj--;
                }
                if (i < gridView.size - 1 && di > 0) {
                    dj++;
                }
            } else {
                if (i >= gridView.size && di < 0) {
                    dj++;
                }
                if (i >= gridView.size - 1 && di > 0) {
                    dj--;
                }
            }
        }

        let newI = i + di;
        let newJ = j + dj;
        if (newI >= 0 && newI < gridView.cellPaths[0].length &&
            newJ >= 0 && newJ < gridView.cellPaths[0][newI].length) {
            navigateTo(gridView, newI, newJ);
        }
        // Prevent the selection from being cancelled on key up.
        event.preventDefault();
    }
}

function navigateTo(gridView, i, j) {
    // Hide the text in the SVG cell, create an input element, and select it.
    let $cell = $(gridView.cellInput[0][i][j]());
    let $svgCell = $(gridView.cellPaths[0][i][j]);
    // Getting the html content would return "&amp;" for "&". Get the node value instead.
    $cell.val($svgCell.find('text')[0].textContent);
    // Temporarily clear the text.
    $svgCell.find('text').html('');
    const selector = `#input_${i}_${j}_${0}`;
    $svgCell.data('input', selector);
    gridView.activeEditingCell = selector;

    $cell.trigger('focus');
    $cell.trigger('select');

    $cell.on('keydown', function(e) {
        checkArrowKeys(gridView, this, e);
    });

    $cell.on('input propertychange', function() {
        const newText = $(this).val() || '.';
        gridView.updateFromHexagons(i, j, newText, false);
        // Reselect the text so that backspace can work normally.
        $(this).trigger('select');
    });

    $cell.on('focusout', function() {
        const newText = $(this).val() || '.';
        this.remove();
        $svgCell.data('input', null);
        if (gridView.activeEditingCell == selector) {
            gridView.activeEditingCell = null;
        }
        gridView.updateFromHexagons(i, j, newText);
        // TODO: is this necessary?
        gridView.updateHexagonWithCode(0, gridView.sourceCode);
    });
}

export function createGrid(gridView, size) {
    gridView.size = size;
    gridView.rowCount = getRowCount(size);
    const radius = 20;
    const cellHeight = radius * 2;
    const cellOffsetY = 3 / 4 * cellHeight;
    const cellOffsetX = Math.sqrt(3) / 2 * radius;
    const cellWidth = cellOffsetX * 2;
    const padding = 10;

    gridView.globalOffsetX = cellWidth;
    gridView.globalOffsetY = cellOffsetY;

    // When showing 6 hexagons around a center hexagon,
    // the "rowCount" below represents the number of rows in the center of one of the side hexagons.
    // the "size" represents the number of rows on the top and bottom edges of the center hexagons.
    // and 1 represents the gap between them.
    gridView.fullWidth = 2*(cellWidth * (gridView.rowCount * 2 + size + 1) + padding);
    gridView.fullHeight = 2*(cellOffsetY * (gridView.rowCount * 3 + 3) + padding);
    const centerX = gridView.fullWidth / 2;
    const centerY = gridView.fullHeight / 2;

    function getX(size, i, j) {
        return centerX +
            (j - size + 1) * cellWidth +
            Math.abs(i - size + 1) * cellOffsetX;
    }

    function getY(size, i) {
        return centerY + (i - size + 1) * cellOffsetY;
    }

    $('#puzzle_parent').css({transform: `matrix(1,0,0,1,${-gridView.fullWidth*0.25},${-gridView.fullHeight*0.25})`, 'transition-property': 'none'});
    $('#puzzle_container').css({'max-width': gridView.fullWidth / 2, 'max-height': gridView.fullHeight /2 });

    let svg = document.querySelector('#puzzle');
    $(svg).attr({ width: gridView.fullWidth, height: gridView.fullHeight });
    let template = svg.querySelector('defs [class~=cell]');
    let parent = svg.querySelector('#cell_container');
    const textParent = document.querySelector('#input_container');
    emptyElement(parent);
    emptyElement(textParent);
    gridView.cellPaths = [];
    gridView.cellInput = [];
    gridView.edgeConnectors = {};

    const largeGridTwoColumnOffset = size * 3;
    const largeGridTwoRowOffset = size * 2;
    const largeGridOneColumnOffset = largeGridTwoColumnOffset / 2;
    const largeGridOneRowOffset = size;

    gridView.offsets = [
        [0,0], // Center
        [0, -largeGridTwoRowOffset, 'N'],
        [largeGridOneColumnOffset, largeGridOneRowOffset, 'SE'],
        [largeGridOneColumnOffset, -largeGridOneRowOffset, 'NE'],
        [0, largeGridTwoRowOffset, 'S'],
        [-largeGridOneColumnOffset, largeGridOneRowOffset, 'SW'],
        [-largeGridOneColumnOffset, -largeGridOneRowOffset, 'NW'],
    ];

    // Create extra hexagons to make it look infinite.
    {
        for (let i = 1; i <= 2; i++) {
            gridView.offsets.push([largeGridOneColumnOffset, largeGridOneRowOffset + i * largeGridTwoRowOffset]);
            gridView.offsets.push([-largeGridOneColumnOffset, largeGridOneRowOffset + i * largeGridTwoRowOffset]);
            gridView.offsets.push([-largeGridOneColumnOffset, largeGridOneRowOffset - (i + 1) * largeGridTwoRowOffset]);
            gridView.offsets.push([largeGridOneColumnOffset, largeGridOneRowOffset - (i + 1) * largeGridTwoRowOffset]);
        }
        for (let i = -5; i <= 5; i++) {
            gridView.offsets.push([largeGridTwoColumnOffset, i * largeGridTwoRowOffset]);
            gridView.offsets.push([-largeGridTwoColumnOffset, i * largeGridTwoRowOffset]);
            gridView.offsets.push([-largeGridOneColumnOffset - largeGridTwoColumnOffset, largeGridOneRowOffset + i * largeGridTwoRowOffset]);
            gridView.offsets.push([largeGridOneColumnOffset + largeGridTwoColumnOffset, -size - i * largeGridTwoRowOffset]);
            if (i < -1 || i > 1) {
                gridView.offsets.push([0, i * largeGridTwoRowOffset]); // Center
            }
        }
    }

    let offsetsDict = {};
    for (let i = 1; i < gridView.offsets.length; i++) {
        if (gridView.offsets[i][2]) {
            offsetsDict[gridView.offsets[i][2]] = i;
        }
    }

    let outlineTemplate = svg.querySelector('defs [class~=outline]');
    let connectorTemplate = svg.querySelector('defs [class~=neutral_connector]');
    let positiveConnector = svg.querySelector('defs [class~=positive_connector]');
    let negativeConnector = svg.querySelector('defs [class~=negative_connector]');
    let outlines = [];
    let connectors = [];
    let positiveConnectors = [];

    const outlinePath = `m ${-cellOffsetX} ${-radius/2}` +
        `l ${cellOffsetX} ${-radius / 2} l ${cellOffsetX} ${radius / 2}`.repeat(size) +
        outlineHelper(0, radius, cellOffsetX, radius / 2, size) +
        outlineHelper(-cellOffsetX, radius / 2, 0, radius, size) +
        outlineHelper(-cellOffsetX, -radius / 2, -cellOffsetX, radius / 2, size) +
        outlineHelper(0, -radius, -cellOffsetX, -radius / 2, size) +
        outlineHelper(cellOffsetX, -radius/2, 0, -radius, size);

    for (let k = 0; k < gridView.offsets.length; k++) {
        let pathGrid = [];
        let inputGrid = [];
        for (let i = 0; i < gridView.rowCount; i++) {
            let pathRow = [];
            let inputRow = [];
            for (let j = 0; j < getRowSize(size, i); j++) {
                const tooltip = `Coordinates: ${indexToAxial(size, i, j)}`;
                let cell = template.cloneNode(true);
                pathRow.push(cell);
                const cellX = getX(size, i, j) + gridView.offsets[k][0] * cellWidth;
                const cellY = getY(size, i, j) + gridView.offsets[k][1] * cellOffsetY;
                cell.id = `path_${i}_${j}_${k}`;
                cell.setAttribute('transform', `translate(${cellX},${cellY})scale(${radius / 20})`);
                cell.querySelector('title').textContent = tooltip;
                parent.appendChild(cell);

                inputRow.push(() => {
                    let text = document.createElement('input');
                    text.type = 'text';
                    text.maxLength = 1;
                    text.id = `input_${i}_${j}_${k}`;
                    text.title = tooltip;
                    text.classList.add('cell_input');
                    text.style.left = `${cellX}px`;
                    text.style.top = `${cellY}px`;
                    text.value = '.';
                    textParent.appendChild(text);
                    return text;
                });
            }
            pathGrid.push(pathRow);
            inputGrid.push(inputRow);
        }
        gridView.cellPaths.push(pathGrid);
        gridView.cellInput.push(inputGrid);

        {
            const cellX = getX(size, 0, 0) + gridView.offsets[k][0] * cellWidth;
            const cellY = getY(size, 0, 0) + gridView.offsets[k][1] * cellOffsetY;
            let outline = outlineTemplate.cloneNode();
            outline.setAttribute('d', outlinePath);
            outline.setAttribute('transform', `translate(${cellX},${cellY})scale(${radius / 20})`);
            outlines.push(outline);
        }

        for (let i = 0; i < size; i++) {
            const leftEnd = i == 0;
            const rightEnd = i == size - 1;
            const isSpecial = leftEnd || rightEnd;
            let connector, cellX, cellY, scaleX, scaleY;

            // Top edge
            {
                connector = (isSpecial ? positiveConnector : connectorTemplate).cloneNode(true);
                cellX = getX(size, 0, i) + gridView.offsets[k][0] * cellWidth + 0.5 * cellOffsetX;
                cellY = getY(size, 0, i) + gridView.offsets[k][1] * cellOffsetY - 0.75 * radius;
                scaleX = radius / 20;
                scaleY = -radius / 20;
                if (i == 0) {
                    // Move the symbol to the opposite end of the connector.
                    cellX -= cellOffsetX;
                    cellY -= cellOffsetY;
                    scaleX *= -1;
                    scaleY *= -1;
                }
                connector.setAttribute('transform', `translate(${cellX},${cellY})scale(${scaleX},${scaleY})rotate(60)`);
                (isSpecial ? positiveConnectors : connectors).push(connector);

                if (k == 0) {
                    connector.next = offsetsDict['N'];
                    gridView.edgeConnectors[`${i},${-size + 1},NE,${rightEnd ? '+' : '0'}`] = connector;
                }
                // Connectors from south hexagon.
                if (k == offsetsDict['S']) {
                    connector.next = offsetsDict['S'];
                    gridView.edgeConnectors[`${i + 1 - size},${size - 1},SW,${leftEnd ? '+' : '0'}`] = connector;
                }

                connector = (isSpecial ? negativeConnector : connectorTemplate).cloneNode(true);
                cellX = getX(size, 0, i) + gridView.offsets[k][0] * cellWidth + 0.5 * cellOffsetX;
                cellY = getY(size, 0, i) + (gridView.offsets[k][1] - 1) * cellOffsetY - 0.75 * radius;
                scaleX = scaleY = -radius / 20;
                if (i == 0) {
                    cellX -= cellOffsetX;
                    cellY += cellOffsetY;
                    scaleX = scaleY *= -1;
                }
                connector.setAttribute('transform', `translate(${cellX},${cellY})scale(${scaleX},${scaleY})rotate(240)`);
                connectors.push(connector);

                if (k == 0) {
                    connector.next = offsetsDict['N'];
                    gridView.edgeConnectors[`${i},${-size + 1},NW,${leftEnd ? '-' : '0'}`] = connector;
                }
                // Connectors from south hexagon.
                if (k == offsetsDict['S']) {
                    connector.next = offsetsDict['S'];
                    gridView.edgeConnectors[`${i + 1 - size},${size - 1},SE,${rightEnd ? '-' : '0'}`] = connector;
                }
            }

            // North east edge
            {
                connector = (isSpecial ? positiveConnector : connectorTemplate).cloneNode(true);
                cellX = getX(size, i, getRowSize(size, i) - 1) + gridView.offsets[k][0] * cellWidth + cellOffsetX;
                cellY = getY(size, i, getRowSize(size, i) - 1) + gridView.offsets[k][1] * cellOffsetY;
                scaleX = radius / 20;
                scaleY = -radius / 20;
                if (i == 0) {
                    cellX += cellOffsetX;
                    cellY -= cellOffsetY;
                    scaleX *= -1;
                    scaleY *= -1;
                }
                connector.setAttribute('transform', `translate(${cellX},${cellY})scale(${scaleX},${scaleY})`);
                (isSpecial ? positiveConnectors : connectors).push(connector);

                if (k == 0) {
                    connector.next = offsetsDict['NE'];
                    gridView.edgeConnectors[`${size - 1},${i + 1 - size},E,${rightEnd ? '+' : '0'}`] = connector;
                }
                // Connectors from south west hexagon.
                if (k == offsetsDict['SW']) {
                    connector.next = offsetsDict['SW'];
                    gridView.edgeConnectors[`${-size + 1},${i},W,${leftEnd ? '+' : '0'}`] = connector;
                }

                connector = (isSpecial ? negativeConnector : connectorTemplate).cloneNode(true);
                cellX = getX(size, i, getRowSize(size, i) - 1) + (gridView.offsets[k][0] + 1) * cellWidth + 0.5 * cellOffsetX;
                cellY = getY(size, i, getRowSize(size, i) - 1) + gridView.offsets[k][1] * cellOffsetY - 0.75 * radius;
                scaleX = scaleY = -radius / 20;
                if (i == 0) {
                    cellX -= cellWidth;
                    scaleX = scaleY *= -1;
                }
                connector.setAttribute('transform', `translate(${cellX},${cellY})scale(${scaleX},${scaleY})rotate(300)`);
                connectors.push(connector);

                if (k == 0) {
                    connector.next = offsetsDict['NE'];
                    gridView.edgeConnectors[`${size - 1},${i + 1 - size},NE,${leftEnd ? '-' : '0'}`] = connector;
                }
                // Connectors from south west hexagon.
                if (k == offsetsDict['SW']) {
                    connector.next = offsetsDict['SW'];
                    gridView.edgeConnectors[`${-size + 1},${i},SW,${rightEnd ? '-' : '0'}`] = connector;
                }
            }

            // South east edge
            {
                let a = i + size - 1;
                connector = (isSpecial ? positiveConnector : connectorTemplate).cloneNode(true);
                cellX = getX(size, a, getRowSize(size, a) - 1) + gridView.offsets[k][0] * cellWidth + 0.5 * cellOffsetX;
                cellY = getY(size, a, getRowSize(size, a) - 1) + gridView.offsets[k][1] * cellOffsetY + 0.75 * radius;
                scaleX = radius / 20;
                scaleY = -radius / 20;
                if (i == 0) {
                    cellX += cellWidth;
                    scaleX *= -1;
                    scaleY *= -1;
                }
                connector.setAttribute('transform', `translate(${cellX},${cellY})scale(${scaleX},${scaleY})rotate(300)`);
                (isSpecial ? positiveConnectors : connectors).push(connector);

                if (k == 0) {
                    connector.next = offsetsDict['SE'];
                    gridView.edgeConnectors[`${size - 1 - i},${i},SE,${rightEnd ? '+' : '0'}`] = connector;
                }
                // Connectors from north west hexagon.
                if (k == offsetsDict['NW']) {
                    connector.next = offsetsDict['NW'];
                    gridView.edgeConnectors[`${-i},${i - size + 1},NW,${leftEnd ? '+' : '0'}`] = connector;
                }

                connector = (isSpecial ? negativeConnector : connectorTemplate).cloneNode(true);
                cellX = getX(size, a, getRowSize(size, a) - 1) + (gridView.offsets[k][0] + 1) * cellWidth;
                cellY = getY(size, a, getRowSize(size, a) - 1) + (gridView.offsets[k][1] + 1) * cellOffsetY;
                scaleX = scaleY = -radius / 20;
                if (i == 0) {
                    cellX -= cellOffsetX;
                    cellY -= cellOffsetY;
                    scaleX = scaleY *= -1;
                }
                connector.setAttribute('transform', `translate(${cellX},${cellY})scale(${scaleX},${scaleY})`);
                connectors.push(connector);

                if (k == 0) {
                    connector.next = offsetsDict['SE'];
                    gridView.edgeConnectors[`${size - 1 - i},${i},E,${leftEnd ? '-' : '0'}`] = connector;
                }
                // Connectors from north west hexagon.
                if (k == offsetsDict['NW']) {
                    connector.next = offsetsDict['NW'];
                    gridView.edgeConnectors[`${-i},${i - size + 1},W,${rightEnd ? '-' : '0'}`] = connector;
                }
            }
        }
    }

    connectors.forEach(x => parent.appendChild(x));
    positiveConnectors.forEach(x => parent.appendChild(x));
    outlines.forEach(x => parent.appendChild(x));

    $('[class~=connector]', $(svg)).on('animationend', function() {
        $(this).removeClass('connector_flash');
    });

    $('[class~=cell]', $(svg)).on('click', function() {
        // Select text when clicking on the background of the cell.
        const [i, j] = getIndices(this);
        navigateTo(gridView, i, j);
    });
}
