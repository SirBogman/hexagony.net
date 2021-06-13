import { set, update } from 'immutable';
import memoizeOne from 'memoize-one';

import { Direction, east, northEast, northWest, southEast, southWest, west } from '../hexagony/Direction';
import { HexagonyContext } from '../hexagony/HexagonyContext';
import { EdgeTraversal, HexagonyStateUtils } from '../hexagony/HexagonyState';
import { ExecutionHistoryArray, InstructionPointer } from '../hexagony/InstructionPointer';
import { ISourceCode } from '../hexagony/SourceCode';
import { arrayInitialize, getRowCount, getRowSize, indexToAxial, removeWhitespaceAndDebug } from '../hexagony/Util';
import { CodeChangeContext, CodeChangeCallback } from './UndoItem';
import { assertNotNull, createSvgElement, emptyElement, getControlKey } from './ViewUtil';

import '../../styles/GridView.scss';

const edgeTransitionSizeLimit = 25;

const edgeLength = 20;
const cellHeight = edgeLength * 2;
const cellOffsetY = 3 / 4 * cellHeight;
const cellOffsetX = Math.sqrt(3) / 2 * edgeLength;
const cellWidth = cellOffsetX * 2;
const padding = 35;
const executedColorCount = 10;

let cellExecuted: readonly string[];
let cellActive: readonly string[];
let cellInactive: readonly string[];
let arrowExecuted: readonly string[];
let arrowActive: readonly string[];
let arrowInactive: readonly string[];
let cellExecutedArray: readonly (readonly string[])[];
let arrowExecutedArray: readonly (readonly string[])[];

interface CellSVGElement extends SVGElement {
    hasBreakpoint: boolean;
    directions: Direction[];
}

interface ArrowSVGElement extends SVGElement {
    dir: Direction;
}

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

const getOutlinePath = memoizeOne((size: number) =>
    `m ${-cellOffsetX} ${-edgeLength/2}` +
    `l ${cellOffsetX} ${-edgeLength / 2} l ${cellOffsetX} ${edgeLength / 2}`.repeat(size) +
    outlineHelper(0, edgeLength, cellOffsetX, edgeLength / 2, size) +
    outlineHelper(-cellOffsetX, edgeLength / 2, 0, edgeLength, size) +
    outlineHelper(-cellOffsetX, -edgeLength / 2, -cellOffsetX, edgeLength / 2, size) +
    outlineHelper(0, -edgeLength, -cellOffsetX, -edgeLength / 2, size) +
    outlineHelper(cellOffsetX, -edgeLength/2, 0, -edgeLength, size));

const emptyExecutionHistory = arrayInitialize(6, () => [] as [number, number, Direction][]);

export class GridView {
    public edgeTransitionMode = false;
    private sourceCode: ISourceCode;
    private updateCodeCallback: CodeChangeCallback;
    private toggleBreakpointCallback: (i: number, j: number) => void;
    private onTypingDirectionChanged: (value: Direction) => void;
    private onUndo: () => CodeChangeContext | null;
    private onRedo: () => CodeChangeContext | null;
    private cellPaths: CellSVGElement[][][] = [];
    private edgeConnectors = new Map<string, SVGElement[]>();
    private edgeConnectors2 = new Map<string, SVGElement[]>();
    private delay: string;
    private directionalTyping = false;
    private executionHistory: readonly ExecutionHistoryArray[] = emptyExecutionHistory;
    private creatingGrid = false;
    private selectedIp = 0;
    private size = -1;
    private rowCount = -1;
    private fullWidth = 0;
    private fullHeight = 0;
    private showArrows = false;
    private showIPs = false;
    private hasFocus = false;
    private lastFocused: readonly [number, number, number] | null = null;
    private typingDirection: Direction = east;
    private codeSvgContainer: HTMLElement;
    private codeSvgParent: HTMLElement;
    private focusProxy: HTMLElement;
    private svg: SVGSVGElement;
    private cellContainer: SVGElement;
    private cellTemplate: SVGElement;
    private cellExecutedArrowTemplate: SVGElement;
    private cellBreakpointTemplate: SVGElement;
    private neutralConnectorTemplate: SVGElement;
    private positiveConnectorTemplate: SVGElement;
    private negativeConnectorTemplate: SVGElement;

    constructor(
        updateCodeCallback: CodeChangeCallback,
        toggleBreakpointCallback: (i: number, j: number) => void,
        onTypingDirectionChanged: (value: Direction) => void,
        onUndo: () => CodeChangeContext | null,
        onRedo: () => CodeChangeContext | null,
        sourceCode: ISourceCode,
        delay: string) {
        this.sourceCode = sourceCode;
        this.updateCodeCallback = updateCodeCallback;
        this.toggleBreakpointCallback = toggleBreakpointCallback;
        this.onTypingDirectionChanged = onTypingDirectionChanged;
        this.onUndo = onUndo;
        this.onRedo = onRedo;
        this.delay = delay;

        const getElementById = (id: string) =>
            assertNotNull(document.getElementById(id), id);

        this.codeSvgContainer = getElementById('codeSvgContainer');
        this.codeSvgParent = getElementById('codeSvgParent');
        this.focusProxy = getElementById('focusProxy');
        this.svg = getElementById('codeSvg') as Element as SVGSVGElement;
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

        this.focusProxy.addEventListener('focusin', () => {
            this.focus();
        });
    }

    // Public API for updating source code.
    setSourceCode(sourceCode: ISourceCode): void {
        this.sourceCode = sourceCode;
        if (sourceCode.size !== this.size) {
            this.lastFocused = null;
            this.createGrid(sourceCode.size);
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
    recreateGrid(ips: readonly InstructionPointer[] | null): void {
        this.creatingGrid = true;
        this.createGrid(this.size);

        for (let k = 0; k < this.cellPaths.length; k++) {
            this.updateHexagonWithCode(k);
        }

        this.updateExecutionHistoryColors();

        if (ips) {
            this.setExecutedState(ips);
        }

        this.creatingGrid = false;
    }

    private foreachExecutionArrow(
        [i, j, dir] : readonly [number, number, Direction],
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

    private addExecutionAngleClass(indices: readonly [number, number, Direction], className: string, k = 0): void {
        this.foreachExecutionArrow(indices, k, true, arrow => {
            arrow.classList.add(className);
            arrow.style.transitionDuration = this.delay;
        });
    }

    private removeExecutionAngleClass(indices: readonly [number, number, Direction], className: string, k = 0): void {
        this.foreachExecutionArrow(indices, k, false, arrow => {
            arrow.classList.remove(className);
            arrow.style.transitionDuration = this.delay;
        });
    }

    private addCellClass(indices: readonly [number, number, Direction], className: string, centerHexagonOnly = false): void {
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

    private removeCellClass(indices: readonly [number, number, Direction], className: string, centerHexagonOnly = false): void {
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

    setExecutedState(ips: readonly InstructionPointer[]): void {
        const { executedGrid } = ips[this.selectedIp];
        this.cellPaths[0].forEach((rows, i) => rows.forEach((cell, j) => {
            const directions = executedGrid[i][j];
            if (directions.length) {
                const path = cell.firstElementChild as SVGElement;
                path.classList.add(cellExecuted[this.selectedIp]);
                path.style.transitionDuration = this.delay;
            }
            if (this.showArrows) {
                for (const dir of directions) {
                    this.addExecutionAngleClass([i, j, dir], arrowExecuted[this.selectedIp]);
                }
            }
        }));
    }

    clearCellExecutionColors(): void {
        if (!this.cellPaths.length) {
            return;
        }

        this.removeExecutionHistoryColors();
        this.executionHistory = emptyExecutionHistory;

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

    private removeExecutionHistoryColors(): void {
        this.executionHistory.forEach((array, ip) => {
            if (ip === this.selectedIp) {
                array.forEach((indices, i) => {
                    this.removeCellClass(indices, i ? cellExecutedArray[ip][i - 1] : cellActive[ip], Boolean(i));
                    this.removeExecutionAngleClass(indices, i ? arrowExecutedArray[ip][i - 1] : arrowActive[ip]);
                });
            }
            else if (this.showIPs && array.length) {
                this.removeCellClass(array[0], cellInactive[ip], true);
                this.removeExecutionAngleClass(array[0], arrowInactive[ip]);
            }
        });
    }

    private updateExecutionHistoryColors(): void {
        this.executionHistory.forEach((array, ip) => {
            if (ip === this.selectedIp) {
                array.forEach((indices, i) => {
                    this.addCellClass(indices, i ? cellExecutedArray[ip][i - 1] : cellActive[ip], Boolean(i));
                    if (!i) {
                        this.addExecutionAngleClass(indices, arrowActive[ip]);
                    }
                    else if (this.showArrows) {
                        this.addExecutionAngleClass(indices, arrowExecutedArray[ip][i - 1]);
                    }
                });
            }
            else if (this.showIPs && array.length) {
                this.addCellClass(array[0], cellInactive[ip], true);
                this.addExecutionAngleClass(array[0], arrowInactive[ip]);
            }
        });

        // Show all executed cells for the selected IP.
        const array = this.executionHistory[this.selectedIp];
        if (array.length) {
            this.addCellClass(array[0], cellExecuted[this.selectedIp], true);
            if (this.showArrows) {
                this.addExecutionAngleClass(array[0], arrowExecuted[this.selectedIp]);
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
        this.removeExecutionHistoryColors();
        this.showIPs = value;
        this.updateExecutionHistoryColors();
    }

    updateActiveCell(
        ips: readonly InstructionPointer[],
        selectedIp: number,
        forceReset: boolean,
        forceUpdateExecutionState: boolean): void {
        const reset = forceReset || selectedIp !== this.selectedIp;
        if (reset) {
            this.clearCellExecutionColors();
        }

        this.removeExecutionHistoryColors();
        // Add one for the active cell.
        this.executionHistory = ips.map(ip => ip.executionHistory.slice(0, executedColorCount + 1));
        this.selectedIp = selectedIp;

        if (!this.hasFocus) {
            // Use the last executed coordinates when the code panel gets focus.
            const [[i, j]] = ips[selectedIp].executionHistory;
            this.lastFocused = [i, j, 0];
        }

        this.updateExecutionHistoryColors();

        if (reset || forceUpdateExecutionState) {
            this.setExecutedState(ips);
        }
    }

    private updateHexagonWithCode(index: number): void {
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

    private onKeyDown(i: number, j: number, k: number, elem: HTMLInputElement, event: KeyboardEvent): void {
        if (elem.selectionStart == elem.selectionEnd &&
            (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Backspace')) {
            // No text is selected. Let the text input element handle it.
            return;
        }

        if (getControlKey(event)) {
            if (this.directionalTyping) {
                if (event.key === 'z' && !event.shiftKey) {
                    const result = this.onUndo();
                    if (result !== null) {
                        const newI = result.i;
                        const newJ = result.j;
                        const newDirection = result.direction;
                        if (newDirection !== undefined) {
                            this.changeTypingDirection(i, j, k, this.typingDirection, newI, newJ, k, newDirection);
                            if (result.edgeTraversal) {
                                this.playEdgeAnimation(result.edgeTraversal);
                            }
                        }
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }
                if (event.key === 'y' || event.key === 'z' && event.shiftKey) {
                    const result = this.onRedo();
                    if (result !== null) {
                        const { newI, newJ, newDirection } = result;
                        if (newI !== undefined && newJ !== undefined && newDirection !== undefined) {
                            this.changeTypingDirection(i, j, k, this.typingDirection, newI, newJ, k, newDirection);
                            if (result.edgeTraversal) {
                                this.playEdgeAnimation(result.edgeTraversal);
                            }
                        }
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }
            }
            if (event.key === 'b') {
                if (this.toggleBreakpointCallback) {
                    this.toggleBreakpointCallback(i, j);
                }
                event.preventDefault();
                return;
            }
        }
        if (event.key === 'Escape') {
            assertNotNull(document.getElementById('speedSlider'), 'speedSlider').focus();
            event.preventDefault();
            return;
        }
        if (event.key === 'Backspace' || event.key === 'Delete') {
            if (this.directionalTyping && event.key === 'Backspace') {
                this.advanceCursor(i, j, k, '.', true);
            }
            else {
                this.updateCodeCallback('.', { i, j });
            }
            event.preventDefault();
            return;
        }

        if (this.directionalTyping) {
            if (event.key === ' ') {
                this.advanceCursor(i, j, k, null, event.shiftKey);
                event.preventDefault();
                return;
            }
            if (event.key === 'ArrowLeft') {
                this.setActiveTypingDirection(i, j, k, west);
                event.preventDefault();
                return;
            }
            else if (event.key === 'ArrowRight') {
                this.setActiveTypingDirection(i, j, k, east);
                event.preventDefault();
                return;
            }
            else if (event.key === 'ArrowDown') {
                this.setActiveTypingDirection(i, j, k, event.shiftKey ? southEast : southWest);
                event.preventDefault();
                return;
            }
            else if (event.key === 'ArrowUp') {
                this.setActiveTypingDirection(i, j, k, event.shiftKey ? northWest : northEast);
                event.preventDefault();
                return;
            }
        }

        let di = 0, dj = 0;
        if (event.key === 'ArrowLeft') {
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
        else if (event.key === 'ArrowRight' ||
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

    public focus(): void {
        if (this.lastFocused !== null) {
            const [i, j, k] = this.lastFocused;
            if (k < this.cellPaths.length &&
                i < this.cellPaths[k].length &&
                j < this.cellPaths[k][i].length) {
                this.navigateTo(i, j, k);
                return;
            }
        }
        this.navigateTo(0, 0, 0);
    }

    private navigateTo(i: number, j: number, k: number): void {
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
            this.addExecutionAngleClass([i, j, this.typingDirection], 'typingDirectionArrow', k);
        }

        input.addEventListener('input', () => {
            const newText = removeWhitespaceAndDebug(input.value) || '.';
            if (this.directionalTyping && newText !== '@') {
                this.advanceCursor(i, j, k, newText);
            }
            else {
                this.updateCodeCallback(newText, { i, j });
                // Reselect the text so that backspace can work normally.
                input.select();
            }
        });

        // The cell has focus. Hide the focus proxy so that tab navigation can leave the code panel in both directions.
        this.lastFocused = [i, j, k];
        this.hasFocus = true;
        this.focusProxy.style.display = 'none';

        input.addEventListener('focusout', () => {
            this.hasFocus = false;
            this.focusProxy.style.display = 'unset';
            this.clearTypingDirectionArrow(i, j, k);
            svgCell.removeChild(container);
            const newText = removeWhitespaceAndDebug(input.value) || '.';
            GridView.setSvgText(svgText, newText);
        });
    }

    private startEdgeAnimation(connectors: readonly SVGElement[] | undefined, name: string): void {
        if (connectors) {
            connectors.forEach(x => {
                x.classList.add(name);
                x.style.animationDuration = this.delay;
            });
        }
    }

    public playEdgeAnimation = ({ edgeName, isBranch }: EdgeTraversal): void => {
        if (this.edgeTransitionMode) {
            const name = isBranch ? 'connectorFlash' : 'connectorNeutralFlash';
            this.startEdgeAnimation(this.edgeConnectors.get(edgeName), name);
            this.startEdgeAnimation(this.edgeConnectors2.get(edgeName), `${name}Secondary`);
        }
    }

    private advanceCursor(i: number, j: number, k: number, newText: string | null = null, reverse = false): void {
        if (!this.directionalTyping) {
            throw new Error('internal error');
        }

        const oldDirection = this.typingDirection;

        const sourceCode = { ...this.sourceCode };
        if (newText !== null) {
            sourceCode.grid = update(sourceCode.grid, i, row => set(row, j, newText));
        }

        const context = new HexagonyContext(sourceCode, '');
        context.isDirectionalTypingSimulation = true;
        context.reverse = reverse;

        let state = HexagonyStateUtils.fromContext(context);
        // Follow positive branches.
        state = HexagonyStateUtils.setMemoryValue(state, 1);
        state = HexagonyStateUtils.setIpLocation(state, context.indexToAxial(i, j), oldDirection);

        state = HexagonyStateUtils.step(state, context);

        let newK = k;
        let edgeTraversal: EdgeTraversal | undefined = undefined;
        if (state.edgeTraversals.length) {
            // When following an edge transition, go back to the center hexagon to ensure the cursor remains on screen.
            newK = 0;
            state.edgeTraversals.forEach(this.playEdgeAnimation);
            // There can only ever be one edge traversal at once.
            [edgeTraversal] = state.edgeTraversals;
        }

        const { coords, dir } = HexagonyStateUtils.activeIpState(state);
        const [newI, newJ] = context.axialToIndex(coords);
        this.changeTypingDirection(i, j, k, oldDirection, newI, newJ, newK, dir);

        if (newText !== null) {
            this.updateCodeCallback(newText, {
                edgeTraversal,
                direction: oldDirection,
                i,
                j,
                newI,
                newJ,
                newDirection: dir,
            });
        }
    }

    private changeTypingDirection(i: number, j: number, k: number, oldDirection: Direction,
        newI: number, newJ: number, newK: number, newDirection: Direction): void {
        this.setTypingDirectionInternal(newDirection);
        if (newI !== i || newJ !== j || newK !== k) {
            this.clearTypingDirectionArrow(i, j, k, oldDirection);
            this.navigateTo(newI, newJ, newK);
        }
    }

    private clearTypingDirectionArrow(i: number, j: number, k: number, direction: Direction | null = null): void {
        this.removeExecutionAngleClass([i, j, direction ?? this.typingDirection], 'typingDirectionArrow', k);
    }

    private setActiveTypingDirection(i: number, j: number, k: number, dir: Direction): void {
        this.clearTypingDirectionArrow(i, j, k);
        this.setTypingDirectionInternal(dir);
        this.addExecutionAngleClass([i, j, this.typingDirection], 'typingDirectionArrow', k);
    }

    public setTypingDirection(dir: Direction): void {
        this.typingDirection = dir;
    }

    private setTypingDirectionInternal(dir: Direction) {
        if (this.typingDirection !== dir) {
            this.typingDirection = dir;
            this.onTypingDirectionChanged(dir);
        }
    }

    private static setSvgText(textElement: Element, text: string): void {
        textElement.textContent = text;
        textElement.classList.toggle('noop', text === '.');
    }

    private addEdgeConnector(key: string, connector: SVGElement, isSecondary: boolean): void {
        if (connector.nodeName !== 'path') {
            connector = connector.firstElementChild as SVGElement;
        }

        const collection = isSecondary ? this.edgeConnectors2 : this.edgeConnectors;
        const current = collection.get(key);
        if (current !== undefined) {
            current.push(connector);
        }
        else {
            collection.set(key, [connector]);
        }
    }

    /**
     * Re-create the hexagon grid using the given hexagon edge length.
     */
    private createGrid(size: number): void {
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
        this.edgeConnectors.clear();
        this.edgeConnectors2.clear();

        const largeGridTwoColumnOffset = size * 3;
        const largeGridTwoRowOffset = size * 2;
        const largeGridOneColumnOffset = largeGridTwoColumnOffset / 2;
        const largeGridOneRowOffset = size;

        const horizontalConnectorsLimit = largeGridOneRowOffset;
        const verticalConnectorsLimit = -largeGridOneRowOffset;
        let offsets: (readonly [number, number, string])[];

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
                        this.addEdgeConnector(`${i},${-size + 1},NE,${rightEnd ? '+' : '0'}`, connector, isSecondary);
                        this.addEdgeConnector(`${i + 1 - size},${size - 1},SW,${leftEnd ? '+' : '0'}`, connector, isSecondary);

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

                        this.addEdgeConnector(`${i},${-size + 1},NW,${leftEnd ? '-' : '0'}`, connector, isSecondary);
                        this.addEdgeConnector(`${i + 1 - size},${size - 1},SE,${rightEnd ? '-' : '0'}`, connector, isSecondary);
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
                        this.addEdgeConnector(`${size - 1},${i + 1 - size},E,${rightEnd ? '+' : '0'}`, connector, isSecondary);
                        this.addEdgeConnector(`${-size + 1},${i},W,${leftEnd ? '+' : '0'}`, connector, isSecondary);

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

                        this.addEdgeConnector(`${size - 1},${i + 1 - size},NE,${leftEnd ? '-' : '0'}`, connector, isSecondary);
                        this.addEdgeConnector(`${-size + 1},${i},SW,${rightEnd ? '-' : '0'}`, connector, isSecondary);
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
                        this.addEdgeConnector(`${size - 1 - i},${i},SE,${rightEnd ? '+' : '0'}`, connector, isSecondary);
                        this.addEdgeConnector(`${-i},${i - size + 1},NW,${leftEnd ? '+' : '0'}`, connector, isSecondary);

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

                        this.addEdgeConnector(`${size - 1 - i},${i},E,${leftEnd ? '-' : '0'}`, connector, isSecondary);
                        this.addEdgeConnector(`${-i},${i - size + 1},W,${rightEnd ? '-' : '0'}`, connector, isSecondary);
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
