import memoizeOne from 'memoize-one';
import { Direction, east, northEast, northWest, southEast, southWest, west } from '../hexagony/Direction';
import { Hexagony } from '../hexagony/Hexagony';
import { ISourceCode } from '../hexagony/SourceCode';
import { arrayInitialize, getRowCount, getRowSize, indexToAxial, removeWhitespaceAndDebug } from '../hexagony/Util';
import { assertNotNull, createSvgElement, emptyElement, getControlKey } from './ViewUtil';

const edgeTransitionSizeLimit = 25;

const edgeLength = 20;
const cellHeight = edgeLength * 2;
const cellOffsetY = 3 / 4 * cellHeight;
const cellOffsetX = Math.sqrt(3) / 2 * edgeLength;
const cellWidth = cellOffsetX * 2;
const padding = 35;
const executedColorCount = 10;

let cellExecuted: string[];
let cellActive: string[];
let cellInactive: string[];
let arrowExecuted: string[];
let arrowActive: string[];
let arrowInactive: string[];
let cellExecutedArray: string[][];
let arrowExecutedArray: string[][];

interface CellSVGElement extends SVGElement {
    hasBreakpoint: boolean;
    directions: Direction[];
}

interface ArrowSVGElement extends SVGElement {
    dir: Direction;
}

type ConnectorDictionary = Record<string, SVGElement[]>;

export function initializeGridColors(colorMode: string, offset: number): void {
    cellExecuted = arrayInitialize(6, (index: number) => `cellExecuted${(index + offset) % 6}${colorMode}`);
    cellActive = arrayInitialize(6, (index: number) => `cellActive${(index + offset) % 6}${colorMode}`);
    cellInactive = arrayInitialize(6, (index: number) => `cellInactive${(index + offset) % 6}${colorMode}`);
    arrowExecuted = arrayInitialize(6, (index: number) => `arrowExecuted${(index + offset) % 6}${colorMode}`);
    arrowActive = arrayInitialize(6, (index: number) => `arrowActive${(index + offset) % 6}${colorMode}`);
    arrowInactive = arrayInitialize(6, (index: number) => `arrowInactive${(index + offset) % 6}${colorMode}`);
    cellExecutedArray = arrayInitialize(6, (i: number) =>
        arrayInitialize(executedColorCount, (j: number) => `cellExecuted${(i + offset) % 6}_${j}${colorMode}`));
    arrowExecutedArray = arrayInitialize(6, (i: number) =>
        arrayInitialize(executedColorCount, (j: number) => `arrowExecuted${(i + offset) % 6}_${j}${colorMode}`));
}

function getIndices(elem: Element) {
    return assertNotNull(elem.id.match(/\d+/g), 'match').map(x => parseInt(x));
}

const outlineHelper = (x1: number, y1: number, x2: number, y2: number, size: number) =>
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
    sourceCode: ISourceCode;
    updateCodeCallback: (i: number, j: number, char: string) => void;
    toggleBreakpointCallback: (i: number, j: number) => void;
    cellPaths: CellSVGElement[][][];
    edgeConnectors: ConnectorDictionary;
    edgeConnectors2: ConnectorDictionary;
    delay: string;
    directionalTyping: boolean;
    executionHistory: [number, number, Direction][][];
    creatingGrid: boolean;
    selectedIp: number;
    size: number;
    rowCount: number;
    fullWidth: number;
    fullHeight: number;
    edgeTransitionMode: boolean;
    showArrows: boolean;
    showIPs: boolean;
    typingDirection: Direction;
    codeSvgContainer: HTMLElement;
    codeSvgParent: HTMLElement;
    svg: SVGSVGElement;
    cellContainer: SVGElement;
    cellTemplate: SVGElement;
    cellExecutedArrowTemplate: SVGElement;
    cellBreakpointTemplate: SVGElement;
    neutralConnectorTemplate: SVGElement;
    positiveConnectorTemplate: SVGElement;
    negativeConnectorTemplate: SVGElement;

    constructor(
        updateCodeCallback: (i: number, j: number, char: string) => void,
        toggleBreakpointCallback: (i: number, j: number) => void,
        sourceCode: ISourceCode,
        delay: string) {
        this.sourceCode = sourceCode;
        this.updateCodeCallback = updateCodeCallback;
        this.toggleBreakpointCallback = toggleBreakpointCallback;
        this.cellPaths = [];
        this.edgeConnectors = {};
        this.edgeConnectors2 = {};
        this.delay = delay;
        this.directionalTyping = false;
        this.executionHistory = arrayInitialize(6, () => [] as [number, number, Direction][]);
        this.creatingGrid = false;
        this.selectedIp = 0;
        this.size = -1;
        this.rowCount = -1;
        this.fullWidth = 0;
        this.fullHeight = 0;
        this.edgeTransitionMode = false;
        this.showArrows = false;
        this.showIPs = false;
        this.typingDirection = east;

        const getElementById = (id: string) =>
            assertNotNull(document.getElementById(id), id);

        this.codeSvgContainer = getElementById('codeSvgContainer');
        this.codeSvgParent = getElementById('codeSvgParent');
        this.svg = getElementById('codeSvg') as unknown as SVGSVGElement;
        this.cellContainer = this.svg.appendChild(createSvgElement('g'));

        const querySelector = (selector: string) =>
            assertNotNull(this.svg.querySelector(selector), selector) as SVGElement;

        this.cellTemplate = querySelector('defs [class~=cell]');
        this.cellExecutedArrowTemplate = querySelector('defs [class~=cellExecutedArrow]');
        this.cellBreakpointTemplate = querySelector('defs [class~=cellBreakpoint]');
        this.neutralConnectorTemplate = querySelector('defs [class~=neutralConnector]');
        this.positiveConnectorTemplate = querySelector('defs [class~=positiveConnector]');
        this.negativeConnectorTemplate = querySelector('defs [class~=negativeConnector]');

        this.svg.addEventListener('animationend', event => {
            if (event.animationName.startsWith('connector')) {
                const target = event.target as Element;
                target.classList.remove('connectorFlash');
                target.classList.remove('connectorNeutralFlash');
                target.classList.remove('connectorFlashSecondary');
                target.classList.remove('connectorNeutralFlashSecondary');
            }
        });

        this.svg.addEventListener('click', event => {
            // Select text when clicking on the background or text of the cell.
            const parent = (event.target as SVGElement).parentNode as SVGElement;
            if (parent.classList.contains('cell')) {
                const [i, j, k] = getIndices(parent);
                this.navigateTo(i, j, k);
            }
        });
    }

    // Public API for updating source code.
    setSourceCode(sourceCode: ISourceCode): void {
        this.sourceCode = sourceCode;
        if (sourceCode.size !== this.size) {
            this._createGrid(sourceCode.size);
        }

        for (let k = 0; k < this.cellPaths.length; k++) {
            this.updateHexagonWithCode(k);
        }
    }

    setBreakpoints(breakpoints: Iterable<number[]>): void {
        for (const [i, j] of breakpoints) {
            this.setBreakpointState(i, j, true);
        }
    }

    setBreakpointState(i: number, j: number, state: boolean): void {
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
                const breakpoint = this.cellBreakpointTemplate.cloneNode() as SVGElement;
                const transform = assertNotNull(cell.getAttribute('transform'), 'transform');
                breakpoint.setAttribute('transform', transform);
                breakpoint.id = `breakpoint${cell.id}`;
                this.cellContainer.appendChild(breakpoint);
                cell.hasBreakpoint = true;
            }
            else {
                const breakpoint = this.svg.querySelector(`#breakpoint${cell.id}`);
                if (breakpoint) {
                    const node = assertNotNull(breakpoint.parentNode, 'breakpoint.parentNode');
                    node.removeChild(breakpoint);
                }
                cell.hasBreakpoint = false;
            }
        }
    }

    // Public API to recreate the grid after changing edgeTransitionMode.
    recreateGrid(executedState: Direction[][][][] | null): void {
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

    _foreachExecutionArrow(
        [i, j, dir] : [number, number, Direction],
        k: number,
        allowCreate: boolean,
        callback: (element: ArrowSVGElement) => void): void {
        let create = false;
        const cell = this.cellPaths[k][i][j];
        if (!cell.directions.includes(dir)) {
            if (!allowCreate) {
                return;
            }
            create = true;
            cell.directions.push(dir);
        }

        let arrow: ArrowSVGElement | null = null;
        if (create) {
            arrow = this.cellExecutedArrowTemplate.cloneNode() as ArrowSVGElement;
            if (!this.creatingGrid) {
                arrow.style.animationDuration = this.delay;
            }
            arrow.dir = dir;
            arrow.setAttribute('transform', `rotate(${dir.angle})`);
            cell.appendChild(arrow);
        }
        else {
            for (const element of cell.querySelectorAll('.cellExecutedArrow')) {
                arrow = element as ArrowSVGElement;
                if (arrow.dir === dir) {
                    break;
                }
            }
        }

        if (arrow) {
            callback(arrow);
        }
    }

    _addExecutionAngleClass(indices: [number, number, Direction], className: string, k = 0): void {
        this._foreachExecutionArrow(indices, k, true, arrow => {
            arrow.classList.add(className);
            arrow.style.transitionDuration = this.delay;
        });
    }

    _removeExecutionAngleClass(indices: [number, number, Direction], className: string, k = 0): void {
        this._foreachExecutionArrow(indices, k, false, arrow => {
            arrow.classList.remove(className);
            arrow.style.transitionDuration = this.delay;
        });
    }

    _addCellClass(indices: [number, number, Direction], className: string, centerHexagonOnly = false): void {
        const [i, j] = indices;
        const limit = centerHexagonOnly ? 1 : this.cellPaths.length;
        for (let k = 0; k < limit; k++) {
            if (k === 1) {
                className += 'Secondary';
            }
            const cell = this.cellPaths[k][i][j];
            const path = cell.firstElementChild as SVGElement;
            path.classList.add(className);
            path.style.transitionDuration = this.delay;
        }
    }

    _removeCellClass(indices: [number, number, Direction], className: string, centerHexagonOnly = false): void {
        const [i, j] = indices;
        const limit = centerHexagonOnly ? 1 : this.cellPaths.length;
        for (let k = 0; k < limit; k++) {
            if (k === 1) {
                className += 'Secondary';
            }
            const cell = this.cellPaths[k][i][j];
            const path = cell.firstElementChild as SVGElement;
            path.classList.remove(className);
            path.style.transitionDuration = this.delay;
        }
    }

    setExecutedState(executedState: Direction[][][][]): void {
        this.cellPaths[0].forEach((rows, i) => rows.forEach((cell, j) => {
            const directions = executedState[this.selectedIp][i][j];
            if (directions.length) {
                const path = cell.firstElementChild as SVGElement;
                path.classList.add(cellExecuted[this.selectedIp]);
                path.style.transitionDuration = this.delay;
            }
            if (this.showArrows) {
                for (const dir of directions) {
                    this._addExecutionAngleClass([i, j, dir], arrowExecuted[this.selectedIp]);
                }
            }
        }));
    }

    clearCellExecutionColors(): void {
        if (!this.cellPaths.length) {
            return;
        }

        this._removeExecutionHistoryColors();
        this.executionHistory = arrayInitialize(6, () => []);

        this.cellPaths[0].forEach(rows => rows.forEach(cell => {
            const path = cell.firstElementChild as SVGElement;
            path.classList.remove(cellExecuted[this.selectedIp]);
            path.style.transitionDuration = this.delay;
            if (this.showArrows) {
                cell.querySelectorAll('.cellExecutedArrow').forEach(element => {
                    const arrow = element as ArrowSVGElement;
                    arrow.classList.remove(arrowExecuted[this.selectedIp]);
                    arrow.style.transitionDuration = this.delay;
                });
            }
        }));
    }

    _removeExecutionHistoryColors(): void {
        this.executionHistory.forEach((array, ip) => {
            if (ip === this.selectedIp) {
                array.forEach((indices, i) => {
                    this._removeCellClass(indices, i ? cellExecutedArray[ip][i - 1] : cellActive[ip], Boolean(i));
                    this._removeExecutionAngleClass(indices, i ? arrowExecutedArray[ip][i - 1] : arrowActive[ip]);
                });
            }
            else if (this.showIPs && array.length) {
                this._removeCellClass(array[0], cellInactive[ip], true);
                this._removeExecutionAngleClass(array[0], arrowInactive[ip]);
            }
        });
    }

    _updateExecutionHistoryColors(): void {
        this.executionHistory.forEach((array, ip) => {
            if (ip === this.selectedIp) {
                array.forEach((indices, i) => {
                    this._addCellClass(indices, i ? cellExecutedArray[ip][i - 1] : cellActive[ip], Boolean(i));
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

    setDelay(value: string): void {
        this.delay = value;
    }

    setDirectionalTyping(value: boolean): void {
        this.directionalTyping = value;
    }

    setShowArrows(value: boolean): void {
        this.clearCellExecutionColors();
        this.showArrows = value;
    }

    setShowIPs(value: boolean): void {
        this._removeExecutionHistoryColors();
        this.showIPs = value;
        this._updateExecutionHistoryColors();
    }

    updateActiveCell(
        executionHistory: [number, number, Direction][][],
        selectedIp: number,
        executedState: Direction[][][][],
        forceReset: boolean,
        forceUpdateExecutionState: boolean): void {
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

    updateHexagonWithCode(index: number): void {
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
                    const text = assertNotNull(cell.querySelector('text'), 'cell text');
                    GridView.setSvgText(text, char);
                }
            }
        }
    }

    onKeyDown(i: number, j: number, k: number, elem: HTMLInputElement, event: KeyboardEvent): void {
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
            assertNotNull(document.getElementById('speedSlider'), 'speedSlider').focus();
            event.preventDefault();
            return;
        }
        if (event.key === 'Backspace' || event.key === 'Delete') {
            this.updateCodeCallback(i, j, '.');
            if (this.directionalTyping && event.key === 'Backspace') {
                this._advanceCursor(i, j, k, true);
            }
            event.preventDefault();
            return;
        }

        if (this.directionalTyping) {
            if (event.key === 'Tab' || event.key === ' ') {
                this._advanceCursor(i, j, k, event.shiftKey);
                event.preventDefault();
                return;
            }
            if (event.key === 'ArrowLeft') {
                this._setTypingDirection(i, j, k, west);
                event.preventDefault();
                return;
            }
            else if (event.key === 'ArrowRight') {
                this._setTypingDirection(i, j, k, east);
                event.preventDefault();
                return;
            }
            else if (event.key === 'ArrowDown') {
                this._setTypingDirection(i, j, k, event.shiftKey ? southEast : southWest);
                event.preventDefault();
                return;
            }
            else if (event.key === 'ArrowUp') {
                this._setTypingDirection(i, j, k, event.shiftKey ? northWest : northEast);
                event.preventDefault();
                return;
            }
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

    navigateTo(i: number, j: number, k: number): void {
        // Hide the text in the SVG cell, create an input element, and select it.
        const svgCell = this.cellPaths[k][i][j];
        const svgText = assertNotNull(svgCell.querySelector('text'), 'svgCell text');
        const originalText = assertNotNull(svgText.textContent, 'svgText.textContent');

        const input = document.createElement('input');
        input.type = 'text';
        input.autocomplete = 'off';
        input.autocapitalize = 'off';
        input.spellcheck = false;
        input.maxLength = 1;
        input.classList.add('cellInput');
        input.value = originalText;
        // Temporarily clear the text.
        svgText.textContent = '';

        const container = createSvgElement('foreignObject');
        const width = 28;
        container.setAttribute('x', `${-width / 2}`);
        container.setAttribute('y', `${-cellHeight / 2}`);
        container.setAttribute('width', `${width}`);
        container.setAttribute('height', `${cellHeight}`);
        input.style.width = `${width}px`;
        input.style.height = `${cellHeight}px`;
        container.appendChild(input);
        svgCell.appendChild(container);

        input.focus();
        input.select();
        input.addEventListener('keydown', e => this.onKeyDown(i, j, k, input, e));

        if (this.directionalTyping) {
            this._addExecutionAngleClass([i, j, this.typingDirection], 'typingDirectionArrow', k);
        }

        input.addEventListener('input', () => {
            const newText = removeWhitespaceAndDebug(input.value) || '.';
            this.updateCodeCallback(i, j, newText);

            if (this.directionalTyping && newText != '@') {
                this._advanceCursor(i, j, k);
            }
            else {
                // Reselect the text so that backspace can work normally.
                input.select();
            }
        });

        input.addEventListener('focusout', () => {
            this._clearTypingDirectionArrow(i, j, k);
            svgCell.removeChild(container);
            const newText = removeWhitespaceAndDebug(input.value) || '.';
            GridView.setSvgText(svgText, newText);
        });
    }

    _startEdgeAnimation(connectors: SVGElement[], name: string): void {
        if (connectors) {
            connectors.forEach(x => {
                x.classList.add(name);
                x.style.animationDuration = this.delay;
            });
        }
    }

    playEdgeAnimation(edgeName: string, isBranch: boolean): void {
        if (this.edgeTransitionMode) {
            const name = isBranch ? 'connectorFlash' : 'connectorNeutralFlash';
            this._startEdgeAnimation(this.edgeConnectors[edgeName], name);
            this._startEdgeAnimation(this.edgeConnectors2[edgeName], `${name}Secondary`);
        }
    }

    _advanceCursor(i: number, j: number, k: number, reverse = false): void {
        // When following an edge transition, go back to the center hexagon to ensure the cursor
        // remains on screen.
        const oldDirection = this.typingDirection;
        let newK = k;
        const edgeEventHandler = (edgeName: string, isBranch: boolean) => {
            newK = 0;
            this.playEdgeAnimation(edgeName, isBranch);
        };
        const hexagony = new Hexagony(this.sourceCode, '', edgeEventHandler);
        // Follow positive branches.
        hexagony.setMemoryValue(1);
        hexagony.setDirectionalTypingSimulation();
        hexagony.coords = hexagony.indexToAxial(i, j);
        hexagony.dir = this.typingDirection;
        hexagony.step(reverse);
        this.typingDirection = hexagony.dir;
        const [newI, newJ] = hexagony.axialToIndex(hexagony.coords);
        if (newI !== i || newJ !== j) {
            this._clearTypingDirectionArrow(i, j, k, oldDirection);
            this.navigateTo(newI, newJ, newK);
        }
    }

    _clearTypingDirectionArrow(i: number, j: number, k: number, direction: Direction | null = null): void {
        this._removeExecutionAngleClass([i, j, direction ?? this.typingDirection], 'typingDirectionArrow', k);
    }

    _setTypingDirection(i: number, j: number, k: number, dir: Direction): void {
        this._clearTypingDirectionArrow(i, j, k);
        this.typingDirection = dir;
        this._addExecutionAngleClass([i, j, this.typingDirection], 'typingDirectionArrow', k);
    }

    static setSvgText(textElement: Element, text: string): void {
        textElement.textContent = text;
        textElement.classList.toggle('noop', text === '.');
    }

    _addEdgeConnector(key: string, connector: SVGElement, isSecondary: boolean): void {
        if (connector.nodeName !== 'path') {
            connector = connector.firstElementChild as SVGElement;
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
    _createGrid(size: number): void {
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

        this.svg.setAttribute('width', this.fullWidth.toString());
        this.svg.setAttribute('height', this.fullHeight.toString());
        const parent = createSvgElement('g');
        this.cellPaths = [];
        this.edgeConnectors = {};

        const largeGridTwoColumnOffset = size * 3;
        const largeGridTwoRowOffset = size * 2;
        const largeGridOneColumnOffset = largeGridTwoColumnOffset / 2;
        const largeGridOneRowOffset = size;

        const horizontalConnectorsLimit = largeGridOneRowOffset;
        const verticalConnectorsLimit = -largeGridOneRowOffset;
        let offsets: [number, number, string][];

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
            offsets = [[0, 0, 'Center']];
        }

        function getX(i: number, j: number, k: number) {
            return centerX +
                (j - size + 1 + offsets[k][0]) * cellWidth +
                Math.abs(i - size + 1) * cellOffsetX;
        }

        function getY(i: number, k: number) {
            return centerY + (i - size + 1 + offsets[k][1]) * cellOffsetY;
        }

        const outlines = [] as SVGElement[];
        const connectors = [] as SVGElement[];
        const positiveConnectors = [] as SVGElement[];

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
                    const cell = this.cellTemplate.cloneNode(true) as CellSVGElement;
                    cell.hasBreakpoint = false;
                    cell.directions = [];
                    pathRow.push(cell);
                    const cellX = getX(i, j, k);
                    const cellY = getY(i, k);
                    cell.id = `path_${i}_${j}_${k}`;
                    cell.setAttribute('transform', `translate(${cellX},${cellY})`);
                    const title = assertNotNull(cell.querySelector('title'), 'cell title');
                    title.textContent = tooltip;
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
                        connector = (isSpecial ? this.positiveConnectorTemplate : this.neutralConnectorTemplate).cloneNode(true) as SVGElement;
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

                        connector = (isSpecial ? this.negativeConnectorTemplate : this.neutralConnectorTemplate).cloneNode(true) as SVGElement;
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
                        connector = (isSpecial ? this.positiveConnectorTemplate : this.neutralConnectorTemplate).cloneNode(true) as SVGElement;
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

                        connector = (isSpecial ? this.negativeConnectorTemplate : this.neutralConnectorTemplate).cloneNode(true) as SVGElement;
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
                        connector = (isSpecial ? this.positiveConnectorTemplate : this.neutralConnectorTemplate).cloneNode(true) as SVGElement;
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

                        connector = (isSpecial ? this.negativeConnectorTemplate : this.neutralConnectorTemplate).cloneNode(true) as SVGElement;
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
