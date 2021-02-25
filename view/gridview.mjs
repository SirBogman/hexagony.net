import { getRowCount, getRowSize, indexToAxial, minifySource, removeWhitespaceAndDebug } from '../hexagony/util.mjs';

export function getIndices(elem) {
    return $(elem).attr('id').match(/\d+/g).map(x => parseInt(x));
}

function outlineHelper(x1, y1, x2, y2, size) {
    return `l ${x1} ${y1}` + `l ${x2} ${y2} l ${x1} ${y1}`.repeat(size - 1);
}

export function updateHexagonWithCode(gridState, index, code) {
    let iterator = code[Symbol.iterator]();
    for (let i = 0; i < gridState.cellPaths[index].length; i++) {
        for (let j = 0; j < gridState.cellPaths[index][i].length; j++) {
            const char = iterator.next().value || '.';
            const text = gridState.cellPaths[index][i][j].find('text');
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

function updateFromHexagons(gridState, targetI, targetJ, value) {
    let code = '';
    let iterator = removeWhitespaceAndDebug(gridState.sourceCode)[Symbol.iterator]();
    for (let i = 0; i < gridState.rowCount; i++) {
        for (let j = 0; j < getRowSize(gridState.size, i); j++) {
            let current = iterator.next().value;
            if (i == targetI && j == targetJ) {
                current = value;
            }
            code += current || '.';
        }
    }

    // Skip the currently editing hexagon 0.
    for (let k = 1; k < gridState.cellPaths.length; k++) {
        updateHexagonWithCode(gridState, k, code);
    }

    gridState.updateCode(minifySource(code));
}

function checkArrowKeys(gridState, elem, event) {
    // TOOD: escape to deselect.
    const [i, j, k] = getIndices(elem);

    if (event.key == 'F9') {
        let path = gridState.cellPaths[k][i][j];
        if (path.hasClass('cell_breakpoint')) {
            path.removeClass('cell_breakpoint');
        }
        else {
            path.addClass('cell_breakpoint');
        }
    }
    if (event.key == 'Backspace') {
        $(elem).val('.');
        if (j) {
            navigateTo(gridState, i, j - 1);
        }
        else if (i) {
            navigateTo(gridState, i - 1, getRowSize(gridState.size, i - 1) - 1);
        }
        else {
            updateFromHexagons(gridState, 0, 0, '.');
            $(elem).select();
        }
        event.preventDefault();
        return;
    }
    if (event.key == 'Delete') {
        $(elem).val('.');
        $(elem) .select();
        updateFromHexagons(gridState, 0, 0, '.');

        event.preventDefault();
        return;
    }

    let di = 0, dj = 0;
    if (event.key == 'ArrowLeft' || event.key == 'Tab' && event.shiftKey) {
        if (j > 0) {
            dj = -1;
        } else if (i > 0) {
            navigateTo(gridState, i - 1, gridState.cellPaths[0][i - 1].length - 1);
            event.preventDefault();
            return;
        } else {
            event.preventDefault();
            return;
        }
    } else if (event.key == 'ArrowRight' || event.key == 'Tab' && !event.shiftKey) {
        if (j < gridState.cellPaths[0][i].length - 1) {
            dj = 1;
        } else if (i < gridState.cellPaths[0].length - 1) {
            navigateTo(gridState, i + 1, 0);
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
                if (i < gridState.size && di < 0) {
                    dj--;
                }
                if (i < gridState.size - 1 && di > 0) {
                    dj++;
                }
            } else {
                if (i >= gridState.size && di < 0) {
                    dj++;
                }
                if (i >= gridState.size - 1 && di > 0) {
                    dj--;
                }
            }
        }

        let newI = i + di;
        let newJ = j + dj;
        if (newI >= 0 && newI < gridState.cellPaths[0].length &&
            newJ >= 0 && newJ < gridState.cellPaths[0][newI].length) {
            navigateTo(gridState, newI, newJ);
        }
        // Prevent the selection from being cancelled on key up.
        event.preventDefault();
    }
}

function navigateTo(gridState, i, j) {
    // Hide the text in the SVG cell, create an input element, and select it.
    let cell = gridState.cellInput[0][i][j]();
    let $svgCell = gridState.cellPaths[0][i][j];
    // Getting the html content would return "&amp;" for "&". Get the node value instead.
    $(cell).val($svgCell.find('text')[0].childNodes[0].nodeValue);
    $svgCell.find('text').html('');

    cell.focus();
    cell.select();

    cell.keydown(function(e) {
        checkArrowKeys(gridState, this, e);
    });

    cell.bind('input propertychange', function() {
        const newText = $(this).val() || '.';
        updateFromHexagons(gridState, i, j, newText);
        // Reselect the text so that backspace can work normally.
        $(this).select();
    });

    cell.focusout(function() {
        const newText = $(this).val() || '.';
        this.remove();
        updateFromHexagons(gridState, i, j, newText);
        updateHexagonWithCode(gridState, 0, gridState.sourceCode);
    });
}

export function createGrid(gridState, size) {
    gridState.size = size;
    gridState.rowCount = getRowCount(size);
    const radius = 20;
    const cellHeight = radius * 2;
    const cellOffsetY = 3 / 4 * cellHeight;
    const cellOffsetX = Math.sqrt(3) / 2 * radius;
    const cellWidth = cellOffsetX * 2;
    const padding = 10;

    gridState.globalOffsetX = cellWidth;
    gridState.globalOffsetY = cellOffsetY;

    // When showing 6 hexagons around a center hexagon,
    // the "rowCount" below represents the number of rows in the center of one of the side hexagons.
    // the "size" represents the number of rows on the top and bottom edges of the center hexagons.
    // and 1 represents the gap between them.
    gridState.fullWidth = 2*(cellWidth * (gridState.rowCount * 2 + size + 1) + padding);
    gridState.fullHeight = 2*(cellOffsetY * (gridState.rowCount * 3 + 3) + padding);
    const centerX = gridState.fullWidth / 2;
    const centerY = gridState.fullHeight / 2;

    function getX(size, i, j) {
        return centerX +
            (j - size + 1) * cellWidth +
            Math.abs(i - size + 1) * cellOffsetX;
    }

    function getY(size, i) {
        return centerY + (i - size + 1) * cellOffsetY;
    }

    $('#puzzle_parent').css({transform: `matrix(1,0,0,1,${-gridState.fullWidth*0.25},${-gridState.fullHeight*0.25})`, 'transition-property': 'none'});
    $('#puzzle_container').css({'max-width': gridState.fullWidth / 2, 'max-height': gridState.fullHeight /2 });

    let $svg = $('#puzzle');
    $svg.attr({ width: gridState.fullWidth, height: gridState.fullHeight });
    let $template = $('defs [class~=cell]', $svg);
    let $parent = $('#cell_container', $svg);
    const textParent = $('#input_container');
    $parent.empty();
    textParent.empty();
    gridState.cellPaths = [];
    gridState.cellInput = [];
    gridState.edgeConnectors = {};

    const largeGridTwoColumnOffset = size * 3;
    const largeGridTwoRowOffset = size * 2;
    const largeGridOneColumnOffset = largeGridTwoColumnOffset / 2;
    const largeGridOneRowOffset = size;

    gridState.offsets = [
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
            gridState.offsets.push([largeGridOneColumnOffset, largeGridOneRowOffset + i * largeGridTwoRowOffset]);
            gridState.offsets.push([-largeGridOneColumnOffset, largeGridOneRowOffset + i * largeGridTwoRowOffset]);
            gridState.offsets.push([-largeGridOneColumnOffset, largeGridOneRowOffset - (i + 1) * largeGridTwoRowOffset]);
            gridState.offsets.push([largeGridOneColumnOffset, largeGridOneRowOffset - (i + 1) * largeGridTwoRowOffset]);
        }
        for (let i = -5; i <= 5; i++) {
            gridState.offsets.push([largeGridTwoColumnOffset, i * largeGridTwoRowOffset]);
            gridState.offsets.push([-largeGridTwoColumnOffset, i * largeGridTwoRowOffset]);
            gridState.offsets.push([-largeGridOneColumnOffset - largeGridTwoColumnOffset, largeGridOneRowOffset + i * largeGridTwoRowOffset]);
            gridState.offsets.push([largeGridOneColumnOffset + largeGridTwoColumnOffset, -size - i * largeGridTwoRowOffset]);
            if (i < -1 || i > 1) {
                gridState.offsets.push([0, i * largeGridTwoRowOffset]); // Center
            }
        }
    }

    let offsetsDict = {};
    for (let i = 1; i < gridState.offsets.length; i++) {
        if (gridState.offsets[i][2]) {
            offsetsDict[gridState.offsets[i][2]] = i;
        }
    }

    let $outlineTemplate = $('defs [class~=outline]', $svg);
    let $connectorTemplate = $('defs [class~=neutral_connector]', $svg);
    let $positiveConnector = $('defs [class~=positive_connector]', $svg);
    let $negativeConnector = $('defs [class~=negative_connector]', $svg);
    let outlines = [];
    let connectors = [];
    let positiveConnectors = [];

    for (let k = 0; k < gridState.offsets.length; k++) {
        let pathGrid = [];
        let inputGrid = [];
        for (let i = 0; i < gridState.rowCount; i++) {
            let pathRow = [];
            let inputRow = [];
            for (let j = 0; j < getRowSize(size, i); j++) {
                const tooltip = `Coordinates: ${indexToAxial(size, i, j)}`;
                let $cell = $template.clone();
                pathRow.push($cell);
                const cellX = getX(size, i, j) + gridState.offsets[k][0] * cellWidth;
                const cellY = getY(size, i, j) + gridState.offsets[k][1] * cellOffsetY;
                $cell.attr({ transform: `translate(${cellX},${cellY})scale(${radius / 20})`, id: `path_${i}_${j}_${k}` });
                $cell.find('title').html(tooltip);
                $parent.append($cell);

                inputRow.push(() => {
                    let text = $(document.createElement('input'));
                    inputRow.push(text);
                    text.attr({ type: 'text', class: 'cell_input', maxlength: 1, id: `input_${i}_${j}_${k}`, title: tooltip });
                    text.css({ left: `${cellX}px`, top: `${cellY}px` });
                    text.val('.');
                    textParent.append(text);
                    return text;
                });
            }
            pathGrid.push(pathRow);
            inputGrid.push(inputRow);
        }
        gridState.cellPaths.push(pathGrid);
        gridState.cellInput.push(inputGrid);

        {
            let $outline = $outlineTemplate.clone();
            let path = `m ${-cellOffsetX} ${-radius/2}` +
                `l ${cellOffsetX} ${-radius / 2} l ${cellOffsetX} ${radius / 2}`.repeat(size) +
                outlineHelper(0, radius, cellOffsetX, radius / 2, size) +
                outlineHelper(-cellOffsetX, radius / 2, 0, radius, size) +
                outlineHelper(-cellOffsetX, -radius / 2, -cellOffsetX, radius / 2, size) +
                outlineHelper(0, -radius, -cellOffsetX, -radius / 2, size) +
                outlineHelper(cellOffsetX, -radius/2, 0, -radius, size);

            $outline.attr({ d: path });
            const cellX = getX(size, 0, 0) + gridState.offsets[k][0] * cellWidth;
            const cellY = getY(size, 0, 0) + gridState.offsets[k][1] * cellOffsetY;
            $outline.attr({ transform: `translate(${cellX},${cellY})scale(${radius / 20})` });
            outlines.push($outline);
        }

        for (let i = 0; i < size; i++) {
            const leftEnd = i == 0;
            const rightEnd = i == size - 1;
            const isSpecial = leftEnd || rightEnd;
            let $connector, cellX, cellY, scaleX, scaleY;

            // Top edge
            {
                $connector = (isSpecial ? $positiveConnector : $connectorTemplate).clone();
                cellX = getX(size, 0, i) + gridState.offsets[k][0] * cellWidth + 0.5 * cellOffsetX;
                cellY = getY(size, 0, i) + gridState.offsets[k][1] * cellOffsetY - 0.75 * radius;
                scaleX = radius / 20;
                scaleY = -radius / 20;
                if (i == 0) {
                    // Move the symbol to the opposite end of the connector.
                    cellX -= cellOffsetX;
                    cellY -= cellOffsetY;
                    scaleX *= -1;
                    scaleY *= -1;
                }
                $connector.attr({ transform: `translate(${cellX},${cellY})scale(${scaleX},${scaleY})rotate(60)` });
                (isSpecial ? positiveConnectors : connectors).push($connector);

                if (k == 0) {
                    $connector.data('next', offsetsDict['N']);
                    gridState.edgeConnectors[`${i},${-size + 1},NE,${rightEnd ? '+' : '0'}`] = $connector;
                }
                // Connectors from south hexagon.
                if (k == offsetsDict['S']) {
                    $connector.data('next', offsetsDict['S']);
                    gridState.edgeConnectors[`${i + 1 - size},${size - 1},SW,${leftEnd ? '+' : '0'}`] = $connector;
                }

                $connector = (isSpecial ? $negativeConnector : $connectorTemplate).clone();
                cellX = getX(size, 0, i) + gridState.offsets[k][0] * cellWidth + 0.5 * cellOffsetX;
                cellY = getY(size, 0, i) + (gridState.offsets[k][1] - 1) * cellOffsetY - 0.75 * radius;
                scaleX = scaleY = -radius / 20;
                if (i == 0) {
                    cellX -= cellOffsetX;
                    cellY += cellOffsetY;
                    scaleX = scaleY *= -1;
                }
                $connector.attr({ transform: `translate(${cellX},${cellY})scale(${scaleX},${scaleY})rotate(240)` });
                connectors.push($connector);

                if (k == 0) {
                    $connector.data('next', offsetsDict['N']);
                    gridState.edgeConnectors[`${i},${-size + 1},NW,${leftEnd ? '-' : '0'}`] = $connector;
                }
                // Connectors from south hexagon.
                if (k == offsetsDict['S']) {
                    $connector.data('next', offsetsDict['S']);
                    gridState.edgeConnectors[`${i + 1 - size},${size - 1},SE,${rightEnd ? '-' : '0'}`] = $connector;
                }
            }

            // North east edge
            {
                $connector = (isSpecial ? $positiveConnector : $connectorTemplate).clone();
                cellX = getX(size, i, getRowSize(size, i) - 1) + gridState.offsets[k][0] * cellWidth + cellOffsetX;
                cellY = getY(size, i, getRowSize(size, i) - 1) + gridState.offsets[k][1] * cellOffsetY;
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

                if (k == 0) {
                    $connector.data('next', offsetsDict['NE']);
                    gridState.edgeConnectors[`${size - 1},${i + 1 - size},E,${rightEnd ? '+' : '0'}`] = $connector;
                }
                // Connectors from south west hexagon.
                if (k == offsetsDict['SW']) {
                    $connector.data('next', offsetsDict['SW']);
                    gridState.edgeConnectors[`${-size + 1},${i},W,${leftEnd ? '+' : '0'}`] = $connector;
                }

                $connector = (isSpecial ? $negativeConnector : $connectorTemplate).clone();
                cellX = getX(size, i, getRowSize(size, i) - 1) + (gridState.offsets[k][0] + 1) * cellWidth + 0.5 * cellOffsetX;
                cellY = getY(size, i, getRowSize(size, i) - 1) + gridState.offsets[k][1] * cellOffsetY - 0.75 * radius;
                scaleX = scaleY = -radius / 20;
                if (i == 0) {
                    cellX -= cellWidth;
                    scaleX = scaleY *= -1;
                }
                $connector.attr({ transform: `translate(${cellX},${cellY})scale(${scaleX},${scaleY})rotate(300)` });
                connectors.push($connector);

                if (k == 0) {
                    $connector.data('next', offsetsDict['NE']);
                    gridState.edgeConnectors[`${size - 1},${i + 1 - size},NE,${leftEnd ? '-' : '0'}`] = $connector;
                }
                // Connectors from south west hexagon.
                if (k == offsetsDict['SW']) {
                    $connector.data('next', offsetsDict['SW']);
                    gridState.edgeConnectors[`${-size + 1},${i},SW,${rightEnd ? '-' : '0'}`] = $connector;
                }
            }

            // South east edge
            {
                let a = i + size - 1;
                $connector = (isSpecial ? $positiveConnector : $connectorTemplate).clone();
                cellX = getX(size, a, getRowSize(size, a) - 1) + gridState.offsets[k][0] * cellWidth + 0.5 * cellOffsetX;
                cellY = getY(size, a, getRowSize(size, a) - 1) + gridState.offsets[k][1] * cellOffsetY + 0.75 * radius;
                scaleX = radius / 20;
                scaleY = -radius / 20;
                if (i == 0) {
                    cellX += cellWidth;
                    scaleX *= -1;
                    scaleY *= -1;
                }
                $connector.attr({ transform: `translate(${cellX},${cellY})scale(${scaleX},${scaleY})rotate(300)` });
                (isSpecial ? positiveConnectors : connectors).push($connector);

                if (k == 0) {
                    $connector.data('next', offsetsDict['SE']);
                    gridState.edgeConnectors[`${size - 1 - i},${i},SE,${rightEnd ? '+' : '0'}`] = $connector;
                }
                // Connectors from north west hexagon.
                if (k == offsetsDict['NW']) {
                    $connector.data('next', offsetsDict['NW']);
                    gridState.edgeConnectors[`${-i},${i - size + 1},NW,${leftEnd ? '+' : '0'}`] = $connector;
                }

                $connector = (isSpecial ? $negativeConnector : $connectorTemplate).clone();
                cellX = getX(size, a, getRowSize(size, a) - 1) + (gridState.offsets[k][0] + 1) * cellWidth;
                cellY = getY(size, a, getRowSize(size, a) - 1) + (gridState.offsets[k][1] + 1) * cellOffsetY;
                scaleX = scaleY = -radius / 20;
                if (i == 0) {
                    cellX -= cellOffsetX;
                    cellY -= cellOffsetY;
                    scaleX = scaleY *= -1;
                }
                $connector.attr({ transform: `translate(${cellX},${cellY})scale(${scaleX},${scaleY})` });
                $parent.append($connector);

                if (k == 0) {
                    $connector.data('next', offsetsDict['SE']);
                    gridState.edgeConnectors[`${size - 1 - i},${i},E,${leftEnd ? '-' : '0'}`] = $connector;
                }
                // Connectors from north west hexagon.
                if (k == offsetsDict['NW']) {
                    $connector.data('next', offsetsDict['NW']);
                    gridState.edgeConnectors[`${-i},${i - size + 1},W,${rightEnd ? '-' : '0'}`] = $connector;
                }
            }
        }
    }

    connectors.forEach(x => $parent.append(x));
    positiveConnectors.forEach(x => $parent.append(x));
    outlines.forEach(x => $parent.append(x));

    $('[class~=connector]', $svg).on('animationend', function() {
        $(this).removeClass('connector_flash');
    });

    $('[class~=cell]', $svg).click(function() {
        // Select text when clicking on the background of the cell.
        const [i, j] = getIndices(this);
        navigateTo(gridState, i, j);
    });
}