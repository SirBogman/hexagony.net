// Contains code related to creating the view of Hexagony's memory.
import { east, northEast, southEast } from '../hexagony/direction.mjs';
import { PointAxial } from '../hexagony/pointaxial.mjs';
import { createSvgElement, emptyElement } from "./viewutil.mjs";

// If the memory pointer is within this normalized distance of an the edge of the container,
// then it will be recentered.
const recenteringThreshold = 0.1;
const recenteringMax = 1.0 - recenteringThreshold;

const xFactor = 20;
const yFactor = 34;

export class MemoryView {
    constructor(hexagony, svg, memoryPanZoom) {
        this.hexagony = hexagony;
        this.svg = svg;
        this.memoryPanZoom = memoryPanZoom;
        this.lineTemplate = svg.querySelector('defs [class~=memory_cell]');
        this.textTemplate = svg.querySelector('defs [class~=memory_text]');
        this.cellContainer = svg.querySelector('#cell_container');
        this.memoryPointer = svg.querySelector('#memory_pointer');
        this.firstUpdate = true;
        this.lastDataVersion = 0;
        this.latestMemoryPointerVersion = 0;
    }

    getContainerSize() {
        const containerStyle = getComputedStyle(this.svg.parentNode);
        return [parseFloat(containerStyle.width), parseFloat(containerStyle.height)]
    }

    // Add the memory pointer (arrow) showing the position and direction.
    updateMemoryPointer() {
        const version = this.hexagony.memory.memoryPointerVersion;
        if (!this.firstUpdate && this.latestMemoryPointerVersion === version) {
            return;
        }

        const [x, y] = this.getMPCoordinates();
        const angle = this.hexagony.memory.dir.angle + (this.hexagony.memory.cw ? 180 : 0);
        this.memoryPointer.style.transform = `translate(${x}px,${y}px)rotate(${angle}deg)`;
        this.latestMemoryPointerVersion = version;
    }

    update() {
        this.updateMemoryPointer();

        // TODO: consider breaking this up into regions and only updating regions that changed.
        // Sometimes in Chrome it's much faster to create an element tree and then attach it.
        // Sometimes it doesn't make a difference. It doesn't seem to matter in Firefox.
        const dataVersion = this.hexagony.memory.dataVersion;
        if (!this.firstUpdate && this.lastDataVersion === dataVersion) {
            return;
        }

        this.lastDataVersion = dataVersion;
        const parent = createSvgElement('g');
        const padding = 40;
        const currentX = this.hexagony.memory.getX();
        const currentY = this.hexagony.memory.getY();
        const minX = Math.min(this.hexagony.memory.minX, currentX) - padding;
        const minY = Math.min(this.hexagony.memory.minY, currentY) - padding;
        const maxX = Math.max(this.hexagony.memory.maxX, currentX) + padding;
        const maxY = Math.max(this.hexagony.memory.maxY, currentY) + padding;

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                if (!((y % 2 === 0 && x % 2 === 0) ||
                    ((y % 4 + 4) % 4 === 1 && (x % 4 + 4) % 4 === 1) ||
                    ((y % 4 + 4) % 4 === 3 && (x % 4 + 4) % 4 === 3))) {
                    continue;
                }

                let dir, mp;

                if (y % 2 !== 0) {
                    dir = east;
                    mp = new PointAxial((x - y) / 4, (y - 1) / 2);
                }
                else if ((x - y) % 4 === 0) {
                    dir = northEast;
                    mp = new PointAxial((x - y) / 4, y / 2);
                }
                else {
                    dir = southEast;
                    mp = new PointAxial((x - y + 2) / 4, (y - 2) / 2);
                }

                const xx = x * xFactor;
                const yy = y * yFactor;
                const hasValue = this.hexagony.memory.hasKey(mp, dir);
                const line = this.lineTemplate.cloneNode();
                const angle = dir === northEast ? 30 : dir === southEast ? -30 : -90;
                line.setAttribute('transform', `translate(${xx},${yy})rotate(${angle})`);
                if (hasValue) {
                    line.classList.add('memory_value');
                }
                parent.appendChild(line);

                if (hasValue) {
                    const value = this.hexagony.memory.getValueAt(mp, dir);
                    let string = value.toString();
                    let extraString = '';

                    const charCode = Number(value % 256n);

                    if (charCode >= 0x20 && charCode <= 0xff && charCode !== 0x7f) {
                        extraString += ` '${String.fromCharCode(charCode)}'`;
                    }
                    else if (charCode === 10) {
                        extraString += " '\\n'";
                    }

                    const text = this.textTemplate.cloneNode(true);
                    const fullString = extraString ? `${string} ${extraString}` : string;

                    text.querySelector('text').textContent = fullString.length > 8 ?
                        string.length > 8 ?
                            fullString.slice(0, 5) + '…' :
                            string :
                        fullString;

                    text.querySelector('title').textContent = fullString;
                    text.setAttribute('transform', `translate(${xx},${yy})rotate(${angle})`);
                    parent.appendChild(text);
                }
            }
        }

        emptyElement(this.cellContainer);
        this.cellContainer.appendChild(parent);

        if (this.firstUpdate) {
            const [x, y] = this.getMPOffset();
            this.memoryPanZoom.moveTo(x, y);
            this.firstUpdate = false;
        }
        else {
            const [a, b] = this.getNormalizedMPCoordinates();
            // Recenter the memory pointer when it gets too close to the edges.
            if (a < recenteringThreshold || a > recenteringMax || b < recenteringThreshold || b > recenteringMax) {
                const [x, y] = this.getMPOffset(this.getScale());
                this.memoryPanZoom.smoothMoveTo(x, y);
            }
        }
    }

    getMPCoordinates() {
        return [this.hexagony.memory.getX() * xFactor, this.hexagony.memory.getY() * yFactor];
    }

    getNormalizedMPCoordinates() {
        const [x, y] = this.getMPCoordinates();
        const t = this.memoryPanZoom.getTransform();
        const [width, height] = this.getContainerSize();
        return [(t.scale * x + t.x) / width, (t.scale * y + t.y) / height];
    }

    // Gets the required offset to center the memory pointer in the container at the given scale.
    // This is essentially the inverse calculation of getNormalizedMPCoordinates.
    getMPOffset(scale = 1.0) {
        const [x, y] = this.getMPCoordinates();
        const [width, height] = this.getContainerSize();
        return [0.5 * width - scale * x, 0.5 * height - scale * y];
    }

    getScale() {
        return this.memoryPanZoom.getTransform().scale;
    }

    resetView() {
        const [x, y] = this.getMPOffset();
        // zoomAbs doesn't cancel movement, so the user might have to wait for the memory view to stop drifting (inertia)
        // if that method were used.
        this.memoryPanZoom.zoomTo(x, y, 1.0 / this.getScale());
        this.memoryPanZoom.moveTo(x, y);
    }
}
