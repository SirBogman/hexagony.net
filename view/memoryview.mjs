// Contains code related to creating the view of Hexagony's memory.
import { east, northEast, southEast } from '../hexagony/direction.mjs';
import { PointAxial } from '../hexagony/pointaxial.mjs';

export function updateMemorySVG(hexagony, memoryPanZoom) {
    let $container = $('#memory_container');
    let $svg = $('#memory_svg');
    let $lineTemplate = $('defs [class~=memory_cell]', $svg);
    let $mpTemplate = $('defs [class~=memory_pointer]', $svg);
    let $textTemplate = $('defs [class~=memory_text]', $svg);
    let $parent = $('#cell_container', $svg);
    $parent.empty();

    const padding = 10;
    const xFactor = 20;
    const yFactor = 34;
    const maxX = hexagony.memory.maxX + padding;
    const minX = hexagony.memory.minX - padding;
    const maxY = hexagony.memory.maxY + padding;
    const minY = hexagony.memory.minY - padding;

    $svg.attr({ width: (maxX - minX) * xFactor, height: (maxY - minY) * yFactor });

    const centerX = 0.5 * (maxX - minX) * xFactor;
    const centerY = 0.5 * (maxY - minY) * yFactor;
    //$svg.css({ transform: `matrix(1 0,0,1, ${0.5 * $container.width() - centerX}, ${0.5 * $container.height() - centerY})` });
    //$svg.attr({ transform: `translate(${0.5 * $container.width() - centerX}, ${0.5 * $container.height() - centerY})` });

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
                    string += ` ‘${String.fromCharCode(Number(value % 256n))}’`;
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
                // TODO: only autoscroll when pointer gets near edges.
                memoryPanZoom.moveTo(0.5 * $container.width() - centerX, 0.5 * $container.height() - centerY);
            }
        }
    }
}
