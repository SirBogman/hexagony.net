import memoizeOne from 'memoize-one';
import { arrayInitialize, getRowCount, getRowSize, indexToAxial, removeWhitespaceAndDebug } from '../hexagony/util.mjs';
import { createSvgElement, emptyElement, getControlKey } from './viewutil.mjs';

const edgeTransitionSizeLimit = 25;

const edgeLength = 20;
const cellHeight = edgeLength * 2;
const cellOffsetY = 3 / 4 * cellHeight;
const cellOffsetX = Math.sqrt(3) / 2 * edgeLength;
const cellWidth = cellOffsetX * 2;
const padding = 35;
const executedColorCount = 10;

let cellExecuted;
let cellActive;
let cellInactive;
let arrowExecuted;
let arrowActive;
let arrowInactive;
let cellExecutedArray;
let arrowExecutedArray;

export function initializeGridColors(colorMode, offset) {
    cellExecuted = arrayInitialize(6, index => `cellExecuted${(index + offset) % 6}${colorMode}`);
    cellActive = arrayInitialize(6, index => `cellActive${(index + offset) % 6}${colorMode}`);
    cellInactive = arrayInitialize(6, index => `cellInactive${(index + offset) % 6}${colorMode}`);
    arrowExecuted = arrayInitialize(6, index => `arrowExecuted${(index + offset) % 6}${colorMode}`);
    arrowActive = arrayInitialize(6, index => `arrowActive${(index + offset) % 6}${colorMode}`);
    arrowInactive = arrayInitialize(6, index => `arrowInactive${(index + offset) % 6}${colorMode}`);
    cellExecutedArray = arrayInitialize(6, i =>
        arrayInitialize(executedColorCount, j => `cellExecuted${(i + offset) % 6}_${j}${colorMode}`));
    arrowExecutedArray = arrayInitialize(6, i =>
        arrayInitialize(executedColorCount, j => `arrowExecuted${(i + offset) % 6}_${j}${colorMode}`));
}

function getIndices(elem) {
    return elem.id.match(/\d+/g).map(x => parseInt(x));
}

const outlineHelper = (x1, y1, x2, y2, size) =>
    `l ${x1} ${y1}` + `l ${x2} ${y2} l ${x1} ${y1}`.repeat(size - 1);

const getOutlinePath = memoizeOne(size =>
    `m ${-cellOffsetX} ${-edgeLength/2}` +
    `l ${cellOffsetX} ${-edgeLength / 2} l ${cellOffsetX} ${edgeLength / 2}`.repeat(size) +
    outlineHelper(0, edgeLength, cellOffsetX, edgeLength / 2, size) +
    outlineHelper(-cellOffsetX, edgeLength / 2, 0, edgeLength, size) +
    outlineHelper(-cellOffsetX, -edgeLength / 2, -cellOffsetX, edgeLength / 2, size) +
    outlineHelper(0, -edgeLength, -cellOffsetX, -edgeLength / 2, size) +
    outlineHelper(cellOffsetX, -edgeLength/2, 0, -edgeLength, size));

export class GridView {
    constructor(updateCodeCallback, toggleBreakpointCallback) {
        this.updateCodeCallback = updateCodeCallback;
        this.toggleBreakpointCallback = toggleBreakpointCallback;
        this.cellPaths = [];
        this.edgeConnectors = {};
        this.edgeConnectors2 = {};
        this.delay = 0;
        this.executionHistory = arrayInitialize(6, () => []);
        this.creatingGrid = false;
        this.selectedIp = 0;
        this.size = -1;
        this.rowCount = -1;
        this.fullWidth = 0;
        this.fullHeight = 0;
        this.edgeTransitionMode = false;
        this.showArrows = false;
        this.showIPs = false;
        this.codeSvgContainer = document.getElementById('codeSvgContainer');
        this.codeSvgParent = document.getElementById('codeSvgParent');
        this.svg = document.getElementById('codeSvg');
        this.cellContainer = this.svg.appendChild(createSvgElement('g'));
        this.cellTemplate = this.svg.querySelector('defs [class~=cell]');
        this.cellExecutedArrowTemplate = this.svg.querySelector('defs [class~=cellExecutedArrow]');
        this.cellBreakpointTemplate = this.svg.querySelector('defs [class~=cellBreakpoint]');
        this.neutralConnectorTemplate = this.svg.querySelector('defs [class~=neutralConnector]');
        this.positiveConnectorTemplate = this.svg.querySelector('defs [class~=positiveConnector]');
        this.negativeConnectorTemplate = this.svg.querySelector('defs [class~=negativeConnector]');

        this.svg.addEventListener('animationend', event => {
            if (event.animationName.startsWith('connector')) {
                event.target.classList.remove('connectorFlash');
                event.target.classList.remove('connectorNeutralFlash');
                event.target.classList.remove('connectorFlashSecondary');
                event.target.classList.remove('connectorNeutralFlashSecondary');
            }
        });

        this.svg.addEventListener('click', event => {
            // Select text when clicking on the background or text of the cell.
            const parent = event.target.parentNode;
            if (parent.classList.contains('cell')) {
                const [i, j, k] = getIndices(parent);
                this.navigateTo(i, j, k);
            }
        });
    }

    // Public API for updating source code.
    setSourceCode(sourceCode) {
        this.sourceCode = sourceCode;
        if (sourceCode.size !== this.size) {
            this._createGrid(sourceCode.size);
        }

        for (let k = 0; k < this.cellPaths.length; k++) {
            this.updateHexagonWithCode(k);
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
                const breakpoint = this.cellBreakpointTemplate.cloneNode();
                breakpoint.setAttribute('transform', cell.getAttribute('transform'));
                breakpoint.id = `breakpoint${cell.id}`;
                this.cellContainer.appendChild(breakpoint);
                cell.hasBreakpoint = true;
            }
            else {
                const breakpoint = this.svg.querySelector(`#breakpoint${cell.id}`);
                if (breakpoint) {
                    breakpoint.parentNode.removeChild(breakpoint);
                }
                cell.hasBreakpoint = false;
            }
        }
    }

    // Public API to recreate the grid after changing edgeTransitionMode.
    recreateGrid(executedState) {
        this.creatingGrid = true;
        this._createGrid(this.size);

        for (let k = 0; k < this.cellPaths.length; k++) {
            this.updateHexagonWithCode(k);
        }

        this._updateExecutionHistoryColors();

        if (executedState) {
            this.setExecutedState(executedState);
        }

        this.creatingGrid = false;
    }

    _foreachExecutionArrow([i, j, angle], allowCreate, callback) {
        let create = false;
        const cell = this.cellPaths[0][i][j];
        if (!cell.angles.includes(angle)) {
            if (!allowCreate) {
                return;
            }
            create = true;
            cell.angles.push(angle);
        }

        let arrow;
        if (create) {
            arrow = this.cellExecutedArrowTemplate.cloneNode();
            if (!this.creatingGrid) {
                arrow.style.animationDuration = this.delay;
            }
            arrow.angle = angle;
            arrow.setAttribute('transform', `rotate(${angle})`);
            cell.appendChild(arrow);
        }
        else {
            for (arrow of cell.querySelectorAll('.cellExecutedArrow')) {
                if (arrow.angle === angle) {
                    break;
                }
            }
        }

        callback(arrow);
    }

    _addExecutionAngleClass(indices, className) {
        this._foreachExecutionArrow(indices, true, arrow => {
            arrow.classList.add(className);
            arrow.style.transitionDuration = this.delay;
        });
    }

    _removeExecutionAngleClass(indices, className) {
        this._foreachExecutionArrow(indices, false, arrow => {
            arrow.classList.remove(className);
            arrow.style.transitionDuration = this.delay;
        });
    }

    _addCellClass(indices, className, centerHexagonOnly = false) {
        const [i, j] = indices;
        const limit = centerHexagonOnly ? 1 : this.cellPaths.length;
        for (let k = 0; k < limit; k++) {
            if (k === 1) {
                className += 'Secondary';
            }
            const cell = this.cellPaths[k][i][j];
            const path = cell.firstElementChild;
            path.classList.add(className);
            path.style.transitionDuration = this.delay;
        }
    }

    _removeCellClass(indices, className, centerHexagonOnly = false) {
        const [i, j] = indices;
        const limit = centerHexagonOnly ? 1 : this.cellPaths.length;
        for (let k = 0; k < limit; k++) {
            if (k === 1) {
                className += 'Secondary';
            }
            const cell = this.cellPaths[k][i][j];
            const path = cell.firstElementChild;
            path.classList.remove(className);
            path.style.transitionDuration = this.delay;
        }
    }

    setExecutedState(executedState) {
        this.cellPaths[0].forEach((rows, i) => rows.forEach((cell, j) => {
            const angles = executedState[this.selectedIp][i][j];
            if (angles.length) {
                const path = cell.firstElementChild;
                path.classList.add(cellExecuted[this.selectedIp]);
                path.style.transitionDuration = this.delay;
            }
            if (this.showArrows) {
                for (const angle of angles) {
                    this._addExecutionAngleClass([i, j, angle], arrowExecuted[this.selectedIp]);
                }
            }
        }));
    }

    clearCellExecutionColors() {
        if (!this.cellPaths.length) {
            return;
        }

        this._removeExecutionHistoryColors();
        this.executionHistory = arrayInitialize(6, () => []);

        this.cellPaths[0].forEach(rows => rows.forEach(cell => {
            const path = cell.firstElementChild;
            path.classList.remove(cellExecuted[this.selectedIp]);
            path.style.transitionDuration = this.delay;
            if (this.showArrows) {
                cell.querySelectorAll('.cellExecutedArrow').forEach(arrow => {
                    arrow.classList.remove(arrowExecuted[this.selectedIp]);
                    arrow.style.transitionDuration = this.delay;
                });
            }
        }));
    }

    _removeExecutionHistoryColors() {
        this.executionHistory.forEach((array, ip) => {
            if (ip === this.selectedIp) {
                array.forEach((indices, i) => {
                    this._removeCellClass(indices, i ? cellExecutedArray[ip][i - 1] : cellActive[ip], i);
                    this._removeExecutionAngleClass(indices, i ? arrowExecutedArray[ip][i - 1] : arrowActive[ip]);
                });
            }
            else if (this.showIPs && array.length) {
                this._removeCellClass(array[0], cellInactive[ip], true);
                this._removeExecutionAngleClass(array[0], arrowInactive[ip]);
            }
        });
    }

    _updateExecutionHistoryColors() {
        this.executionHistory.forEach((array, ip) => {
            if (ip === this.selectedIp) {
                array.forEach((indices, i) => {
                    this._addCellClass(indices, i ? cellExecutedArray[ip][i - 1] : cellActive[ip], i);
                    if (!i) {
                        this._addExecutionAngleClass(indices, arrowActive[ip]);
                    }
                    else if (this.showArrows) {
                        this._addExecutionAngleClass(indices, arrowExecutedArray[ip][i - 1]);
                    }
                });
            }
            else if (this.showIPs && array.length) {
                this._addCellClass(array[0], cellInactive[ip], true);
                this._addExecutionAngleClass(array[0], arrowInactive[ip]);
            }
        });

        // Show all executed cells for the selected IP.
        const array = this.executionHistory[this.selectedIp];
        if (array.length) {
            this._addCellClass(array[0], cellExecuted[this.selectedIp], true);
            if (this.showArrows) {
                this._addExecutionAngleClass(array[0], arrowExecuted[this.selectedIp]);
            }
        }
    }

    setDelay(value) {
        this.delay = value;
    }

    setShowArrows(value) {
        this.clearCellExecutionColors();
        this.showArrows = value;
    }

    setShowIPs(value) {
        this._removeExecutionHistoryColors();
        this.showIPs = value;
        this._updateExecutionHistoryColors();
    }

    updateActiveCell(executionHistory, selectedIp, executedState, forceReset, forceUpdateExecutionState) {
        const reset = forceReset || selectedIp !== this.selectedIp;
        if (reset) {
            this.clearCellExecutionColors();
        }

        this._removeExecutionHistoryColors();
        // Add one for the active cell.
        this.executionHistory = executionHistory.map(array => array.slice(0, executedColorCount + 1));
        this.selectedIp = selectedIp;
        this._updateExecutionHistoryColors();

        if (reset || forceUpdateExecutionState) {
            this.setExecutedState(executedState);
        }
    }

    updateHexagonWithCode(index) {
        const { grid } = this.sourceCode;
        for (let i = 0; i < this.cellPaths[index].length; i++) {
            const row = grid[i];
            for (let j = 0; j < this.cellPaths[index][i].length; j++) {
                const cell = this.cellPaths[index][i][j];
                const char = row[j];
                const input = cell.querySelector('input');
                if (input) {
                    input.value = char;
                    input.select();
                }
                else {
                    this._setSvgText(cell.querySelector('text'), char);
                }
            }
        }
    }

    onKeyDown(i, j, k, elem, event) {
        if (elem.selectionStart == elem.selectionEnd &&
            (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Backspace')) {
            // No text is selected. Let the text input element handle it.
            return;
        }

        if (event.key === 'b' && getControlKey(event)) {
            if (this.toggleBreakpointCallback) {
                this.toggleBreakpointCallback(i, j);
            }
            event.preventDefault();
            return;
        }
        if (event.key === 'Escape') {
            document.getElementById('speedSlider').focus();
            event.preventDefault();
            return;
        }
        if (event.key === 'Backspace' || event.key === 'Delete') {
            this.updateCodeCallback(i, j, '.');
            event.preventDefault();
            return;
        }

        let di = 0, dj = 0;
        if (event.key === 'ArrowLeft' || event.key === 'Tab' && event.shiftKey) {
            if (j > 0) {
                dj = -1;
            }
            else if (i > 0) {
                this.navigateTo(i - 1, this.cellPaths[0][i - 1].length - 1, k);
                event.preventDefault();
                return;
            }
            else {
                event.preventDefault();
                return;
            }
        }
        else if (event.key === 'ArrowRight' || event.key === 'Tab' && !event.shiftKey ||
                 event.key === 'Enter' && !getControlKey(event)) {
            if (j < this.cellPaths[0][i].length - 1) {
                dj = 1;
            }
            else if (i < this.cellPaths[0].length - 1) {
                this.navigateTo(i + 1, 0, k);
                event.preventDefault();
                return;
            }
            else {
                event.preventDefault();
                return;
            }
        }
        else if (event.key === 'ArrowUp') {
            di = -1;
        }
        else if (event.key === 'ArrowDown') {
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
                }
                else {
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
        const svgCell = this.cellPaths[k][i][j];
        const svgText = svgCell.querySelector('text');

        const input = document.createElement('input');
        input.type = 'text';
        input.autocomplete = 'off';
        input.autocapitalize = 'off';
        input.spellcheck = 'false';
        input.maxLength = 1;
        input.classList.add('cellInput');
        input.value = svgText.textContent;
        // Temporarily clear the text.
        svgText.textContent = '';

        const container = createSvgElement('foreignObject');
        const width = 28;
        container.setAttribute('x', -width / 2);
        container.setAttribute('y', -cellHeight / 2);
        container.setAttribute('width', width);
        container.setAttribute('height', cellHeight);
        input.style.width = `${width}px`;
        input.style.height = `${cellHeight}px`;
        container.appendChild(input);
        svgCell.appendChild(container);

        input.focus();
        input.select();
        input.addEventListener('keydown', e => this.onKeyDown(i, j, k, input, e));

        const angle = 0;
        this._addExecutionAngleClass([i, j, angle], 'typingDirectionArrow');

        input.addEventListener('input', () => {
            const newText = removeWhitespaceAndDebug(input.value) || '.';
            this.updateCodeCallback(i, j, newText);
            // Reselect the text so that backspace can work normally.
            input.select();
        });

        input.addEventListener('focusout', () => {
            this._removeExecutionAngleClass([i, j, angle], 'typingDirectionArrow');
            svgCell.removeChild(container);
            this._setSvgText(svgText, input.value);
        });
    }

    _setSvgText(textElement, text) {
        textElement.textContent = text;
        textElement.classList.toggle('noop', text === '.');
    }

    _addEdgeConnector(key, connector, isSecondary) {
        if (connector.nodeName !== 'path') {
            connector = connector.firstElementChild;
        }

        const collection = isSecondary ? this.edgeConnectors2 : this.edgeConnectors;
        const current = collection[key];
        if (current !== undefined) {
            current.push(connector);
        }
        else {
            collection[key] = [connector];
        }
    }

    /**
     * Re-create the hexagon grid using the given hexagon edge length.
     */
    _createGrid(size) {
        this.size = size;
        this.rowCount = getRowCount(size);

        const edgeTransitionMode = this.edgeTransitionMode && size <= edgeTransitionSizeLimit;

        // When showing 6 hexagons around a center hexagon,
        // the "rowCount" below represents the number of rows in the center of one of the side hexagons.
        // the "size" represents the number of rows on the top and bottom edges of the center hexagons.
        // and 1 represents the gap between them.
        if (edgeTransitionMode) {
            this.fullWidth = 2*(cellWidth * (this.rowCount * 2 + size + 1) + padding);

            // This is just enough room to show a couple rows of the hexagons above and below the center one.
            // More might be shown than this, but this is the minimum to show.
            this.fullHeight = 2 * (cellOffsetY * (this.rowCount + 6));
        }
        else {
            this.fullWidth = 2 * (cellWidth * this.rowCount + padding);
            this.fullHeight = 2 * (cellOffsetY * this.rowCount + padding);
        }

        const centerX = this.fullWidth / 2;
        const centerY = this.fullHeight / 2;

        this.codeSvgParent.style.transform = `matrix(1,0,0,1,${-this.fullWidth*0.25},${-this.fullHeight*0.25})`;
        this.codeSvgContainer.style.maxWidth = `${this.fullWidth / 2}px`;
        this.codeSvgContainer.style.maxHeight = `${this.fullHeight /2}px`;

        this.svg.setAttribute('width', this.fullWidth);
        this.svg.setAttribute('height', this.fullHeight);
        const parent = createSvgElement('g');
        this.cellPaths = [];
        this.edgeConnectors = {};

        const largeGridTwoColumnOffset = size * 3;
        const largeGridTwoRowOffset = size * 2;
        const largeGridOneColumnOffset = largeGridTwoColumnOffset / 2;
        const largeGridOneRowOffset = size;

        const horizontalConnectorsLimit = largeGridOneRowOffset;
        const verticalConnectorsLimit = -largeGridOneRowOffset;
        let offsets;

        if (this.edgeTransitionMode) {
            // Layout with seven hexagons.
            offsets = [
                [0, 0, 'Center'],
                [0, -largeGridTwoRowOffset, 'N'],
                [largeGridOneColumnOffset, largeGridOneRowOffset, 'SE'],
                [largeGridOneColumnOffset, -largeGridOneRowOffset, 'NE'],
                [0, largeGridTwoRowOffset, 'S'],
                [-largeGridOneColumnOffset, largeGridOneRowOffset, 'SW'],
                [-largeGridOneColumnOffset, -largeGridOneRowOffset, 'NW'],
            ];
        }
        else {
            // Center hexagon only.
            offsets = [[0, 0]];
        }

        function getX(i, j, k) {
            return centerX +
                (j - size + 1 + offsets[k][0]) * cellWidth +
                Math.abs(i - size + 1) * cellOffsetX;
        }

        function getY(i, k) {
            return centerY + (i - size + 1 + offsets[k][1]) * cellOffsetY;
        }

        const outlines = [];
        const connectors = [];
        const positiveConnectors = [];

        const hexagonParents = [];
        for (let k = 0; k < offsets.length; k++) {
            const node = createSvgElement('g');
            parent.appendChild(node);
            hexagonParents.push(node);
        }

        for (let k = 0; k < offsets.length; k++) {
            const pathGrid = [];
            for (let i = 0; i < this.rowCount; i++) {
                const pathRow = [];
                for (let j = 0; j < getRowSize(size, i); j++) {
                    const tooltip = `Coordinates: (${indexToAxial(size, i, j)})`;
                    const cell = this.cellTemplate.cloneNode(true);
                    cell.angles = [];
                    pathRow.push(cell);
                    const cellX = getX(i, j, k);
                    const cellY = getY(i, k);
                    cell.id = `path_${i}_${j}_${k}`;
                    cell.setAttribute('transform', `translate(${cellX},${cellY})`);
                    cell.querySelector('title').textContent = tooltip;
                    hexagonParents[k].appendChild(cell);
                }
                pathGrid.push(pathRow);
            }
            this.cellPaths.push(pathGrid);

            {
                const cellX = getX(0, 0, k);
                const cellY = getY(0, k);
                const outline = createSvgElement('path');
                outline.classList.add('outline');
                if (k && edgeTransitionMode) {
                    outline.classList.add('outlineSecondary');
                }
                outline.setAttribute('d', getOutlinePath(size));
                outline.setAttribute('transform', `translate(${cellX},${cellY})`);
                outlines.push(outline);
            }

            if (edgeTransitionMode) {
                for (let i = 0; i < size; i++) {
                    const leftEnd = i == 0;
                    const rightEnd = i == size - 1;
                    const isSpecial = leftEnd || rightEnd;
                    let connector, cellX, cellY, scaleX, scaleY;

                    // Top edge.
                    if (offsets[k][1] > verticalConnectorsLimit) {
                        connector = (isSpecial ? this.positiveConnectorTemplate : this.neutralConnectorTemplate).cloneNode(true);
                        cellX = getX(0, i, k) + 0.5 * cellOffsetX;
                        cellY = getY(0, k) - 0.75 * edgeLength;
                        scaleX = 1;
                        scaleY = -1;
                        if (i == 0) {
                            // Move the symbol to the opposite end of the connector.
                            cellX -= cellOffsetX;
                            cellY -= cellOffsetY;
                            scaleX *= -1;
                            scaleY *= -1;
                        }
                        connector.setAttribute('transform', `translate(${cellX},${cellY})scale(${scaleX},${scaleY})rotate(60)`);
                        (isSpecial ? positiveConnectors : connectors).push(connector);

                        const isSecondary = k !== 0 && offsets[k][2] != 'S';
                        this._addEdgeConnector(`${i},${-size + 1},NE,${rightEnd ? '+' : '0'}`, connector, isSecondary);
                        this._addEdgeConnector(`${i + 1 - size},${size - 1},SW,${leftEnd ? '+' : '0'}`, connector, isSecondary);

                        connector = (isSpecial ? this.negativeConnectorTemplate : this.neutralConnectorTemplate).cloneNode(true);
                        cellX = getX(0, i, k) + 0.5 * cellOffsetX;
                        cellY = getY(0, k) - cellOffsetY - 0.75 * edgeLength;
                        scaleX = scaleY = -1;
                        if (i == 0) {
                            cellX -= cellOffsetX;
                            cellY += cellOffsetY;
                            scaleX = scaleY *= -1;
                        }
                        connector.setAttribute('transform', `translate(${cellX},${cellY})scale(${scaleX},${scaleY})rotate(240)`);
                        connectors.push(connector);

                        this._addEdgeConnector(`${i},${-size + 1},NW,${leftEnd ? '-' : '0'}`, connector, isSecondary);
                        this._addEdgeConnector(`${i + 1 - size},${size - 1},SE,${rightEnd ? '-' : '0'}`, connector, isSecondary);
                    }

                    if (offsets[k][0] < horizontalConnectorsLimit && offsets[k][1] >= verticalConnectorsLimit) {
                        // North east edge
                        connector = (isSpecial ? this.positiveConnectorTemplate : this.neutralConnectorTemplate).cloneNode(true);
                        cellX = getX(i, getRowSize(size, i) - 1, k) + cellOffsetX;
                        cellY = getY(i, k);
                        scaleX = 1;
                        scaleY = -1;
                        if (i == 0) {
                            cellX += cellOffsetX;
                            cellY -= cellOffsetY;
                            scaleX *= -1;
                            scaleY *= -1;
                        }
                        connector.setAttribute('transform', `translate(${cellX},${cellY})scale(${scaleX},${scaleY})`);
                        (isSpecial ? positiveConnectors : connectors).push(connector);

                        const isSecondary = k !== 0 && offsets[k][2] != 'SW';
                        this._addEdgeConnector(`${size - 1},${i + 1 - size},E,${rightEnd ? '+' : '0'}`, connector, isSecondary);
                        this._addEdgeConnector(`${-size + 1},${i},W,${leftEnd ? '+' : '0'}`, connector, isSecondary);

                        connector = (isSpecial ? this.negativeConnectorTemplate : this.neutralConnectorTemplate).cloneNode(true);
                        cellX = getX(i, getRowSize(size, i) - 1, k) + cellWidth + 0.5 * cellOffsetX;
                        cellY = getY(i, k) - 0.75 * edgeLength;
                        scaleX = scaleY = -1;
                        if (i == 0) {
                            cellX -= cellWidth;
                            scaleX = scaleY *= -1;
                        }
                        connector.setAttribute('transform', `translate(${cellX},${cellY})scale(${scaleX},${scaleY})rotate(300)`);
                        connectors.push(connector);

                        this._addEdgeConnector(`${size - 1},${i + 1 - size},NE,${leftEnd ? '-' : '0'}`, connector, isSecondary);
                        this._addEdgeConnector(`${-size + 1},${i},SW,${rightEnd ? '-' : '0'}`, connector, isSecondary);
                    }

                    if (offsets[k][0] < horizontalConnectorsLimit && offsets[k][1] <= -verticalConnectorsLimit) {
                        // South east edge
                        const a = i + size - 1;
                        connector = (isSpecial ? this.positiveConnectorTemplate : this.neutralConnectorTemplate).cloneNode(true);
                        cellX = getX(a, getRowSize(size, a) - 1, k) + 0.5 * cellOffsetX;
                        cellY = getY(a, k) + 0.75 * edgeLength;
                        scaleX = 1;
                        scaleY = -1;
                        if (i == 0) {
                            cellX += cellWidth;
                            scaleX *= -1;
                            scaleY *= -1;
                        }
                        connector.setAttribute('transform', `translate(${cellX},${cellY})scale(${scaleX},${scaleY})rotate(300)`);
                        (isSpecial ? positiveConnectors : connectors).push(connector);

                        const isSecondary = k !== 0 && offsets[k][2] != 'NW';
                        this._addEdgeConnector(`${size - 1 - i},${i},SE,${rightEnd ? '+' : '0'}`, connector, isSecondary);
                        this._addEdgeConnector(`${-i},${i - size + 1},NW,${leftEnd ? '+' : '0'}`, connector, isSecondary);

                        connector = (isSpecial ? this.negativeConnectorTemplate : this.neutralConnectorTemplate).cloneNode(true);
                        cellX = getX(a, getRowSize(size, a) - 1, k) + cellWidth;
                        cellY = getY(a, k) + cellOffsetY;
                        scaleX = scaleY = -1;
                        if (i == 0) {
                            cellX -= cellOffsetX;
                            cellY -= cellOffsetY;
                            scaleX = scaleY *= -1;
                        }
                        connector.setAttribute('transform', `translate(${cellX},${cellY})scale(${scaleX},${scaleY})`);
                        connectors.push(connector);

                        this._addEdgeConnector(`${size - 1 - i},${i},E,${leftEnd ? '-' : '0'}`, connector, isSecondary);
                        this._addEdgeConnector(`${-i},${i - size + 1},W,${rightEnd ? '-' : '0'}`, connector, isSecondary);
                    }
                }
            }
        }

        connectors.forEach(x => parent.appendChild(x));
        positiveConnectors.forEach(x => parent.appendChild(x));
        outlines.forEach(x => parent.appendChild(x));
        emptyElement(this.cellContainer);
        this.cellContainer.appendChild(parent);
    }
}
