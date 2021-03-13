import { countCodepoints, getHexagonSize, getRowCount, getRowSize, indexToAxial, minifySource, removeWhitespaceAndDebug } from '../hexagony/util.mjs';
import { emptyElement } from "./viewutil.mjs";

const EXECUTED_COLOR_COUNT = 10;
const CELL_EXECUTED = 'cell_executed';
const CELL_ACTIVE = 'cell_active';
const CELL_TERMINATED = 'cell_terminated';

function getIndices(elem) {
    return elem.id.match(/\d+/g).map(x => parseInt(x));
}

function outlineHelper(x1, y1, x2, y2, size) {
    return `l ${x1} ${y1}` + `l ${x2} ${y2} l ${x1} ${y1}`.repeat(size - 1);
}

export class GridView {
    constructor(updateCodeCallback, updateUndoButtonsCallback, toggleBreakpointCallback) {
        this.updateCodeCallback = updateCodeCallback;
        this.updateUndoButtonsCallback = updateUndoButtonsCallback;
        this.toggleBreakpointCallback = toggleBreakpointCallback;
        this.cellPaths = [];
        this.cellInput = [];
        this.edgeConnectors = {};
        this.offsets = [];
        this.delay = 0;
        this.globalOffsetX = 0;
        this.globalOffsetY = 0;
        this.executionHistory = [];
        this.size = -1;
        this.rowCount = -1;
        this.timeoutID = null;
        this.fullWidth = 0;
        this.fullHeight = 0;
        this.sourceCode = '';
        this.filteredSourceCode = '';
        this.undoStack = [];
        this.redoStack = [];
        this.isUndoRedoInProgress = false;
        this.activeEditingCell = null;
        this.edgeTransitionMode = false;

        const svg = document.querySelector('#puzzle');

        svg.addEventListener('animationend', event => {
            event.target.classList.remove('connector_flash');
            event.target.classList.remove('connector_neutral_flash');

        });

        svg.addEventListener('click', event => {
            // Select text when clicking on the background or text of the cell.
            const parent = event.target.parentNode;
            if (parent.classList.contains('cell')) {
                const [i, j, k] = getIndices(parent);
                this.navigateTo(i, j, k);
            }
        });
    }

    // Public API for updating source code.
    setSourceCode(code, isProgrammatic) {
        const oldCode = this.sourceCode;
        if (oldCode != code) {
            const filteredCode = removeWhitespaceAndDebug(code);
            const newSize = getHexagonSize(countCodepoints(filteredCode));
            const isSizeChange = newSize != this.size;
            if (isSizeChange) {
                this._createGrid(newSize);
            }

            for (let k = 0; k < this.cellPaths.length; k++) {
                this.updateHexagonWithCode(k, filteredCode);
            }

            this._updateCode(code, isProgrammatic);

            if (!isProgrammatic) {
                this.pushUndoItem(
                    () => this.setSourceCode(oldCode),
                    () => this.setSourceCode(code),
                    isSizeChange);
            }
        }
    }

    setBreakpoints(breakpoints) {
        for (const [i, j] of breakpoints) {
            this.setBreakpointState(i, j, true);
        }
    }

    setBreakpointState(i, j, state) {
        for (let k = 0; k < this.cellPaths.length; k++) {
            if (i >= this.cellPaths[k].length || j >= this.cellPaths[k][i].length) {
                return;
            }

            const cell = this.cellPaths[k][i][j];
            if (state == cell.hasBreakpoint) {
                continue;
            }

            if (state) {
                // Append breakpoints so that they appear higher in the Z-order.
                const svg = document.querySelector('#puzzle');
                const parent = svg.querySelector('#cell_container');
                const breakpointTemplate = svg.querySelector('defs [class~=cell_breakpoint]');
                const breakpoint = breakpointTemplate.cloneNode();
                breakpoint.setAttribute('transform', cell.getAttribute('transform'));
                breakpoint.id = `breakpoint_${cell.id}`;
                parent.appendChild(breakpoint);
                cell.hasBreakpoint = true;
            }
            else {
                const svg = document.querySelector('#puzzle');
                const breakpoint = svg.querySelector(`#breakpoint_${cell.id}`);
                if (breakpoint) {
                    breakpoint.parentNode.removeChild(breakpoint);
                }
                cell.hasBreakpoint = false;
            }
        }
    }

    // Public API to recreate the grid after changing edgeTransitionMode.
    recreateGrid() {
        this._createGrid(this.size);

        for (let k = 0; k < this.cellPaths.length; k++) {
            this.updateHexagonWithCode(k, this.filteredSourceCode);
        }

        this._updateExecutionHistoryColors();
    }

    setExecutedState(executedState) {
        for (let i = 0; i < executedState.length; i++) {
            for (let j = 0; j < executedState[i].length; j++) {
                if (executedState[i][j] && !this.cellPaths[0][i][j].classList.contains(CELL_EXECUTED)) {
                    for (let k = 0; k < this.cellPaths.length; k++) {
                        this.cellPaths[k][i][j].classList.add(CELL_EXECUTED);
                    }
                }
            }
        }
    }

    _addCellClass(indices, className) {
        const [i, j] = indices;
        for (let k = 0; k < this.cellPaths.length; k++) {
            const cell = this.cellPaths[k][i][j];
            cell.classList.add(className);
            cell.style.transitionDuration = `${this.delay}ms`;
        }
    }

    _removeCellClass(indices, className) {
        const [i, j] = indices;
        for (let k = 0; k < this.cellPaths.length; k++) {
            this.cellPaths[k][i][j].classList.remove(className);
        }
    }

    _updateCode(code, isProgrammatic=false) {
        this.filteredSourceCode = removeWhitespaceAndDebug(code);
        if (this.sourceCode != code) {
            this.sourceCode = code;
            this.updateCodeCallback(code, isProgrammatic);
        }
    }

    canUndo(isRunning) {
        if (this.undoStack.length == 0) {
            return false;
        }

        return !isRunning || !this.undoStack[this.undoStack.length - 1].isSizeChange;
    }

    canRedo(isRunning) {
        if (this.redoStack.length == 0) {
            return false;
        }

        return !isRunning || !this.redoStack[this.redoStack.length - 1].isSizeChange;
    }

    undo() {
        if (this.undoStack.length) {
            const undoItem = this.undoStack.pop();
            this.redoStack.push(undoItem);
            this.isUndoRedoInProgress = true;
            try {
                undoItem.undo();
            }
            finally {
                this.isUndoRedoInProgress = false;
            }
            this.updateUndoButtonsCallback();
        }
    }

    redo() {
        if (this.redoStack.length) {
            const undoItem = this.redoStack.pop();
            this.undoStack.push(undoItem);
            this.isUndoRedoInProgress = true;
            try {
                undoItem.redo();
            }
            finally {
                this.isUndoRedoInProgress = false;
            }
            this.updateUndoButtonsCallback();
        }
    }

    pushUndoItem(undoFunction, redoFunction, isSizeChange) {
        if (!this.isUndoRedoInProgress) {
            this.undoStack.push({
                undo: undoFunction,
                redo: redoFunction,
                isSizeChange: isSizeChange,
            });
            this.redoStack = [];
            this.updateUndoButtonsCallback();
        }
    }

    clearCellExecutionColors() {
        this._removeExecutionHistoryColors();
        this.executionHistory = [];
        this.cellPaths.forEach(x => x.forEach(y => y.forEach(z => z.classList.remove(CELL_EXECUTED))));
    }

    _removeExecutionHistoryColors() {
        this.executionHistory.forEach((indices, i) =>
            this._removeCellClass(indices, i ? `${CELL_EXECUTED}${i}` : CELL_ACTIVE));

        if (this.executionHistory[0]) {
            this._removeCellClass(this.executionHistory[0], CELL_TERMINATED);
        }
    }

    _updateExecutionHistoryColors() {
        this.executionHistory.forEach((indices, i) =>
            this._addCellClass(indices, i ? `${CELL_EXECUTED}${i}` : CELL_ACTIVE));

        if (this.executionHistory[0]) {
            this._addCellClass(this.executionHistory[0], CELL_EXECUTED);
        }
    }

    updateActiveCell(isTerminated, executionHistory) {
        if (isTerminated) {
            this._addCellClass(executionHistory[0], CELL_TERMINATED);
        }

        this._removeExecutionHistoryColors();
        // Add one for the active cell.
        this.executionHistory = executionHistory.slice(0, EXECUTED_COLOR_COUNT + 1);
        this._updateExecutionHistoryColors();
    }

    updateHexagonWithCode(index, code) {
        const iterator = code[Symbol.iterator]();
        for (let i = 0; i < this.cellPaths[index].length; i++) {
            for (let j = 0; j < this.cellPaths[index][i].length; j++) {
                const cell = this.cellPaths[index][i][j];
                const char = iterator.next().value || '.';
                if (cell.input) {
                    const input = document.querySelector(cell.input);
                    input.value = char;
                    input.select();
                }
                else {
                    const text = cell.querySelector('text');
                    text.textContent = char;
                    if (char == '.') {
                        text.classList.add('noop');
                    }
                    else {
                        text.classList.remove('noop');
                    }
                }
            }
        }
    }

    updateFromHexagons(targetI, targetJ, value, skipActiveHexagon = null) {
        let code = '';
        let oldValue = '.';
    
        const iterator = this.filteredSourceCode[Symbol.iterator]();
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
            () => this.updateFromHexagons(targetI, targetJ, value),
            false);

        for (let k = 0; k < this.cellPaths.length; k++) {
            if (k != skipActiveHexagon) {
                this.updateHexagonWithCode(k, code);
            }
        }
    
        this._updateCode(minifySource(code));
    }

    _resetPuzzleParent() {
        const puzzleParent = document.querySelector('#puzzle_parent');
        puzzleParent.style.transform = `matrix(1,0,0,1,${-this.fullWidth*0.25},${-this.fullHeight*0.25})`;
        puzzleParent.style['transition-property'] = 'none';
    }

    checkArrowKeys(elem, event) {
        // TOOD: escape to deselect.
        const [i, j, k] = getIndices(elem);

        if (elem.selectionStart == elem.selectionEnd &&
            (event.key == 'ArrowLeft' || event.key == 'ArrowRight' || event.key == 'Backspace')) {
            // No text is selected. Let the text input element handle it.
            return;
        }

        if (event.key == 'b' && event.ctrlKey) {
            if (this.toggleBreakpointCallback) {
                this.toggleBreakpointCallback(i, j);
            }
            event.preventDefault();
            return;
        }
        if (event.key == 'Escape') {
            document.querySelector('#speed_slider').focus();
            event.preventDefault();
            return;
        }
        if (event.key == 'Backspace') {
            this.updateFromHexagons(i, j, '.');
            if (j) {
                this.navigateTo(i, j - 1, k);
            }
            else if (i) {
                this.navigateTo(i - 1, getRowSize(this.size, i - 1) - 1, k);
            }
            event.preventDefault();
            return;
        }
        if (event.key == 'Delete') {
            this.updateFromHexagons(i, j, '.');
            event.preventDefault();
            return;
        }

        let di = 0, dj = 0;
        if (event.key == 'ArrowLeft' || event.key == 'Tab' && event.shiftKey) {
            if (j > 0) {
                dj = -1;
            } else if (i > 0) {
                this.navigateTo(i - 1, this.cellPaths[0][i - 1].length - 1, k);
                event.preventDefault();
                return;
            } else {
                event.preventDefault();
                return;
            }
        } else if (event.key == 'ArrowRight' || event.key == 'Tab' && !event.shiftKey) {
            if (j < this.cellPaths[0][i].length - 1) {
                dj = 1;
            } else if (i < this.cellPaths[0].length - 1) {
                this.navigateTo(i + 1, 0, k);
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
                    if (i < this.size && di < 0) {
                        dj--;
                    }
                    if (i < this.size - 1 && di > 0) {
                        dj++;
                    }
                } else {
                    if (i >= this.size && di < 0) {
                        dj++;
                    }
                    if (i >= this.size - 1 && di > 0) {
                        dj--;
                    }
                }
            }

            const newI = i + di;
            const newJ = j + dj;
            if (newI >= 0 && newI < this.cellPaths[0].length &&
                newJ >= 0 && newJ < this.cellPaths[0][newI].length) {
                this.navigateTo(newI, newJ, k);
            }
            // Prevent the selection from being cancelled on key up.
            event.preventDefault();
        }
    }

    navigateTo(i, j, k) {
        // Hide the text in the SVG cell, create an input element, and select it.
        const cell = this.cellInput[k][i][j]();
        const svgCell = this.cellPaths[k][i][j];
        // Getting the html content would return "&amp;" for "&". Get the node value instead.
        const svgText = svgCell.querySelector('text');
        cell.value = svgText.textContent;
        // Temporarily clear the text.
        svgText.textContent = '';
        const selector = `#input_${i}_${j}_${k}`;
        svgCell.input = selector;
        this.activeEditingCell = selector;

        cell.focus();
        cell.select();
        cell.addEventListener('keydown', (e) => this.checkArrowKeys(cell, e));

        cell.addEventListener('input', () => {
            const newText = cell.value || '.';
            this.updateFromHexagons(i, j, newText, k);
            // Reselect the text so that backspace can work normally.
            cell.select();
        });

        cell.addEventListener('focusout', () => {
            cell.parentNode.removeChild(cell);
            svgCell.input = null;
            if (this.activeEditingCell == selector) {
                this.activeEditingCell = null;
            }
            this.updateHexagonWithCode(k, this.filteredSourceCode);
        });
    }

    _addEdgeConnector(key, connector) {
        const current = this.edgeConnectors[key];
        if (current !== undefined) {
            current.push(connector);
        }
        else {
            this.edgeConnectors[key] = [connector];
        }
    }

    /**
     * Re-create the hexagon grid using the given hexagon edge length.
     */
    _createGrid(size) {
        this.size = size;
        this.rowCount = getRowCount(size);
        const radius = 20;
        const cellHeight = radius * 2;
        const cellOffsetY = 3 / 4 * cellHeight;
        const cellOffsetX = Math.sqrt(3) / 2 * radius;
        const cellWidth = cellOffsetX * 2;
        const padding = 35;

        this.globalOffsetX = cellWidth;
        this.globalOffsetY = cellOffsetY;

        // When showing 6 hexagons around a center hexagon,
        // the "rowCount" below represents the number of rows in the center of one of the side hexagons.
        // the "size" represents the number of rows on the top and bottom edges of the center hexagons.
        // and 1 represents the gap between them.
        if (this.edgeTransitionMode) {
            this.fullWidth = 2*(cellWidth * (this.rowCount * 2 + size + 1) + padding);
            this.fullHeight = 2*(cellOffsetY * (this.rowCount * 3 + 3) + padding);
        }
        else {
            this.fullWidth = 2 * (cellWidth * this.rowCount + padding);
            this.fullHeight = 2 * (cellOffsetY * this.rowCount + padding);
        }
        const centerX = this.fullWidth / 2;
        const centerY = this.fullHeight / 2;

        function getX(size, i, j) {
            return centerX +
                (j - size + 1) * cellWidth +
                Math.abs(i - size + 1) * cellOffsetX;
        }

        function getY(size, i) {
            return centerY + (i - size + 1) * cellOffsetY;
        }

        const puzzleContainer = document.querySelector('#puzzle_container');
        this._resetPuzzleParent();

        puzzleContainer.style['max-width'] = `${this.fullWidth / 2}px`;
        puzzleContainer.style['max-height'] = `${this.fullHeight /2}px`;

        const svg = document.querySelector('#puzzle');
        svg.setAttribute('width', this.fullWidth);
        svg.setAttribute('height', this.fullHeight);
        const template = svg.querySelector('defs [class~=cell]');
        const cellContainer = svg.querySelector('#cell_container');
        const parent = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const textParent = document.querySelector('#input_container');
        emptyElement(parent);
        emptyElement(textParent);
        this.cellPaths = [];
        this.cellInput = [];
        this.edgeConnectors = {};

        const largeGridTwoColumnOffset = size * 3;
        const largeGridTwoRowOffset = size * 2;
        const largeGridOneColumnOffset = largeGridTwoColumnOffset / 2;
        const largeGridOneRowOffset = size;

        this.offsets = [ [0,0] ];

        const topConnectors = largeGridOneRowOffset - 2 * largeGridTwoRowOffset;

        // Create extra hexagons to make it look infinite.
        if (this.edgeTransitionMode) {
            for (let i = -2; i < 2; i++) {
                // Columns to the immediate right and left with 4 hexagons (two fully visible)
                this.offsets.push([largeGridOneColumnOffset, largeGridOneRowOffset + i * largeGridTwoRowOffset]);
                this.offsets.push([-largeGridOneColumnOffset, largeGridOneRowOffset + i * largeGridTwoRowOffset]);
            }

            // For the column two to the left, show a couple more hexagons, because their connectors are visible.
            for (let i = -2; i <= 2; i++) {
                this.offsets.push([-largeGridTwoColumnOffset, i * largeGridTwoRowOffset]);
            }

            // Column two to the right.
            for (let i = -2; i <= 2; i++) {
                this.offsets.push([largeGridTwoColumnOffset, i * largeGridTwoRowOffset]);
            }

            for (let i = -2; i <= 2; i++) {
                if (i != 0) {
                    // Add hexagons to the center column. The connectors for the top and bottom ones are visible.
                    this.offsets.push([0, i * largeGridTwoRowOffset]);
                }
            }
        }

        const connectorTemplate = svg.querySelector('defs [class~=neutral_connector]');
        const positiveConnector = svg.querySelector('defs [class~=positive_connector]');
        const negativeConnector = svg.querySelector('defs [class~=negative_connector]');
        const outlines = [];
        const connectors = [];
        const positiveConnectors = [];

        const outlinePath = `m ${-cellOffsetX} ${-radius/2}` +
            `l ${cellOffsetX} ${-radius / 2} l ${cellOffsetX} ${radius / 2}`.repeat(size) +
            outlineHelper(0, radius, cellOffsetX, radius / 2, size) +
            outlineHelper(-cellOffsetX, radius / 2, 0, radius, size) +
            outlineHelper(-cellOffsetX, -radius / 2, -cellOffsetX, radius / 2, size) +
            outlineHelper(0, -radius, -cellOffsetX, -radius / 2, size) +
            outlineHelper(cellOffsetX, -radius/2, 0, -radius, size);

        const hexagonParents = [];
        for (let k = 0; k < this.offsets.length; k++) {
            const node = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            if (k != 0) {
                node.style.fillOpacity = 0.25;
            }
            parent.appendChild(node);
            hexagonParents.push(node);
        }

        for (let k = 0; k < this.offsets.length; k++) {
            const pathGrid = [];
            const inputGrid = [];
            for (let i = 0; i < this.rowCount; i++) {
                const pathRow = [];
                const inputRow = [];
                for (let j = 0; j < getRowSize(size, i); j++) {
                    const tooltip = `Coordinates: ${indexToAxial(size, i, j)}`;
                    const cell = template.cloneNode(true);
                    pathRow.push(cell);
                    const cellX = getX(size, i, j) + this.offsets[k][0] * cellWidth;
                    const cellY = getY(size, i, j) + this.offsets[k][1] * cellOffsetY;
                    cell.id = `path_${i}_${j}_${k}`;
                    cell.setAttribute('transform', `translate(${cellX},${cellY})scale(${radius / 20})`);
                    cell.querySelector('title').textContent = tooltip;
                    hexagonParents[k].appendChild(cell);

                    inputRow.push(() => {
                        const text = document.createElement('input');
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
            this.cellPaths.push(pathGrid);
            this.cellInput.push(inputGrid);

            {
                const cellX = getX(size, 0, 0) + this.offsets[k][0] * cellWidth;
                const cellY = getY(size, 0, 0) + this.offsets[k][1] * cellOffsetY;
                const outline = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                outline.classList.add('outline');
                if (k && this.edgeTransitionMode) {
                    outline.classList.add('outline_secondary');
                }
                outline.setAttribute('d', outlinePath);
                outline.setAttribute('transform', `translate(${cellX},${cellY})scale(${radius / 20})`);
                outlines.push(outline);
            }

            if (this.edgeTransitionMode) {
                for (let i = 0; i < size; i++) {
                    const leftEnd = i == 0;
                    const rightEnd = i == size - 1;
                    const isSpecial = leftEnd || rightEnd;
                    let connector, cellX, cellY, scaleX, scaleY;

                    // Top edge.
                    if (this.offsets[k][1] > topConnectors) {
                        connector = (isSpecial ? positiveConnector : connectorTemplate).cloneNode(true);
                        cellX = getX(size, 0, i) + this.offsets[k][0] * cellWidth + 0.5 * cellOffsetX;
                        cellY = getY(size, 0, i) + this.offsets[k][1] * cellOffsetY - 0.75 * radius;
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

                        this._addEdgeConnector(`${i},${-size + 1},NE,${rightEnd ? '+' : '0'}`, connector);
                        this._addEdgeConnector(`${i + 1 - size},${size - 1},SW,${leftEnd ? '+' : '0'}`, connector);

                        connector = (isSpecial ? negativeConnector : connectorTemplate).cloneNode(true);
                        cellX = getX(size, 0, i) + this.offsets[k][0] * cellWidth + 0.5 * cellOffsetX;
                        cellY = getY(size, 0, i) + (this.offsets[k][1] - 1) * cellOffsetY - 0.75 * radius;
                        scaleX = scaleY = -radius / 20;
                        if (i == 0) {
                            cellX -= cellOffsetX;
                            cellY += cellOffsetY;
                            scaleX = scaleY *= -1;
                        }
                        connector.setAttribute('transform', `translate(${cellX},${cellY})scale(${scaleX},${scaleY})rotate(240)`);
                        connectors.push(connector);

                        this._addEdgeConnector(`${i},${-size + 1},NW,${leftEnd ? '-' : '0'}`, connector);
                        this._addEdgeConnector(`${i + 1 - size},${size - 1},SE,${rightEnd ? '-' : '0'}`, connector);
                    }

                    if (this.offsets[k][0] < largeGridTwoColumnOffset && this.offsets[k][1] >= topConnectors) {
                        // North east edge
                        connector = (isSpecial ? positiveConnector : connectorTemplate).cloneNode(true);
                        cellX = getX(size, i, getRowSize(size, i) - 1) + this.offsets[k][0] * cellWidth + cellOffsetX;
                        cellY = getY(size, i, getRowSize(size, i) - 1) + this.offsets[k][1] * cellOffsetY;
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

                        this._addEdgeConnector(`${size - 1},${i + 1 - size},E,${rightEnd ? '+' : '0'}`, connector);
                        this._addEdgeConnector(`${-size + 1},${i},W,${leftEnd ? '+' : '0'}`, connector);

                        connector = (isSpecial ? negativeConnector : connectorTemplate).cloneNode(true);
                        cellX = getX(size, i, getRowSize(size, i) - 1) + (this.offsets[k][0] + 1) * cellWidth + 0.5 * cellOffsetX;
                        cellY = getY(size, i, getRowSize(size, i) - 1) + this.offsets[k][1] * cellOffsetY - 0.75 * radius;
                        scaleX = scaleY = -radius / 20;
                        if (i == 0) {
                            cellX -= cellWidth;
                            scaleX = scaleY *= -1;
                        }
                        connector.setAttribute('transform', `translate(${cellX},${cellY})scale(${scaleX},${scaleY})rotate(300)`);
                        connectors.push(connector);

                        this._addEdgeConnector(`${size - 1},${i + 1 - size},NE,${leftEnd ? '-' : '0'}`, connector);
                        this._addEdgeConnector(`${-size + 1},${i},SW,${rightEnd ? '-' : '0'}`, connector);
                    }

                    if (this.offsets[k][0] < largeGridTwoColumnOffset && this.offsets[k][1] <= -topConnectors) {
                        // South east edge
                        const a = i + size - 1;
                        connector = (isSpecial ? positiveConnector : connectorTemplate).cloneNode(true);
                        cellX = getX(size, a, getRowSize(size, a) - 1) + this.offsets[k][0] * cellWidth + 0.5 * cellOffsetX;
                        cellY = getY(size, a, getRowSize(size, a) - 1) + this.offsets[k][1] * cellOffsetY + 0.75 * radius;
                        scaleX = radius / 20;
                        scaleY = -radius / 20;
                        if (i == 0) {
                            cellX += cellWidth;
                            scaleX *= -1;
                            scaleY *= -1;
                        }
                        connector.setAttribute('transform', `translate(${cellX},${cellY})scale(${scaleX},${scaleY})rotate(300)`);
                        (isSpecial ? positiveConnectors : connectors).push(connector);

                        this._addEdgeConnector(`${size - 1 - i},${i},SE,${rightEnd ? '+' : '0'}`, connector);
                        this._addEdgeConnector(`${-i},${i - size + 1},NW,${leftEnd ? '+' : '0'}`, connector);

                        connector = (isSpecial ? negativeConnector : connectorTemplate).cloneNode(true);
                        cellX = getX(size, a, getRowSize(size, a) - 1) + (this.offsets[k][0] + 1) * cellWidth;
                        cellY = getY(size, a, getRowSize(size, a) - 1) + (this.offsets[k][1] + 1) * cellOffsetY;
                        scaleX = scaleY = -radius / 20;
                        if (i == 0) {
                            cellX -= cellOffsetX;
                            cellY -= cellOffsetY;
                            scaleX = scaleY *= -1;
                        }
                        connector.setAttribute('transform', `translate(${cellX},${cellY})scale(${scaleX},${scaleY})`);
                        connectors.push(connector);

                        this._addEdgeConnector(`${size - 1 - i},${i},E,${leftEnd ? '-' : '0'}`, connector);
                        this._addEdgeConnector(`${-i},${i - size + 1},W,${rightEnd ? '-' : '0'}`, connector);
                    }
                }
            }
        }

        connectors.forEach(x => parent.appendChild(x));
        positiveConnectors.forEach(x => parent.appendChild(x));
        outlines.forEach(x => parent.appendChild(x));
        emptyElement(cellContainer);
        cellContainer.appendChild(parent);
    }
}
