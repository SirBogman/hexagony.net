// Contains code related to creating the view of Hexagony's memory.
import { east, northEast, southEast } from '../hexagony/direction.mjs';
import { PointAxial } from '../hexagony/pointaxial.mjs';
import { emptyElement } from "./viewutil.mjs";

export function updateMemorySVG(hexagony, memoryPanZoom) {
    const svg = document.querySelector('#memory_svg');
    const lineTemplate = svg.querySelector('defs [class~=memory_cell]');
    const mpTemplate = svg.querySelector('defs [class~=memory_pointer]');
    const textTemplate = svg.querySelector('defs [class~=memory_text]');
    const parent = svg.querySelector('#cell_container');
    emptyElement(parent);

    const containerStyle = getComputedStyle(document.querySelector('#memory_container'));
    const containerWidth = parseFloat(containerStyle.width);
    const containerHeight = parseFloat(containerStyle.height);

    const padding = 40;
    const xFactor = 20;
    const yFactor = 34;
    const maxX = hexagony.memory.maxX + padding;
    const minX = hexagony.memory.minX - padding;
    const maxY = hexagony.memory.maxY + padding;
    const minY = hexagony.memory.minY - padding;

    svg.setAttribute('width', (maxX - minX) * xFactor);
    svg.setAttribute('height', (maxY - minY) * yFactor);

    const centerX = 0.5 * (maxX - minX) * xFactor;
    const centerY = 0.5 * (maxY - minY) * yFactor;

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
            const line = lineTemplate.cloneNode();
            let angle = dir == northEast ? 30 : dir == southEast ? -30 : -90;
            line.setAttribute('transform', `translate(${xx},${yy})rotate(${angle})`);
            if (hasValue) {
                line.classList.add('memory_value');
            }
            parent.appendChild(line);

            if (hasValue) {
                const value = hexagony.memory.getValueAt(mp, dir);
                let string = value.toString();

                if (value >= 0x20 && value <= 0xff && value != 0x7f) {
                    string += ` ‘${String.fromCharCode(Number(value % 256n))}’`;
                }

                const text = textTemplate.cloneNode(true);
                text.querySelector('text').textContent = string;
                text.setAttribute('transform', `translate(${xx},${yy})rotate(${angle})`);
                parent.appendChild(text);
            }

            if (mp.q == hexagony.memory.mp.q && mp.r == hexagony.memory.mp.r && dir == hexagony.memory.dir) {
                // Add the memory pointer (arrow) showing the position and direction.
                angle = (dir == northEast ? -60 : dir == southEast ? 60 : 0) + (hexagony.memory.cw ? 180 : 0);
                const pointer = mpTemplate.cloneNode();
                pointer.setAttribute('transform', `translate(${xx},${yy})rotate(${angle})`);
                parent.appendChild(pointer);
                // TODO: only autoscroll when pointer gets near edges.
                memoryPanZoom.moveTo(0.5 * containerWidth - centerX, 0.5 * containerHeight - centerY);
            }
        }
    }
}
