import memoizeOne from 'memoize-one';

export const edgeLength = 20;
export const cellHeight = edgeLength * 2;
export const cellOffsetY = 3 / 4 * cellHeight;
export const cellOffsetX = Math.sqrt(3) / 2 * edgeLength;
export const cellWidth = cellOffsetX * 2;

export const getHexagonOffsets = memoizeOne(size => {
    const largeGridTwoRowOffset = size * 2;
    const largeGridOneRowOffset = size;
    const largeGridOneColumnOffset = size * 3 / 2;
    // Layout with seven hexagons.
    return [
        [0, 0, 'Center'],
        [0, -largeGridTwoRowOffset, 'N'],
        [largeGridOneColumnOffset, largeGridOneRowOffset, 'SE'],
        [largeGridOneColumnOffset, -largeGridOneRowOffset, 'NE'],
        [0, largeGridTwoRowOffset, 'S'],
        [-largeGridOneColumnOffset, largeGridOneRowOffset, 'SW'],
        [-largeGridOneColumnOffset, -largeGridOneRowOffset, 'NW'],
    ];
});

export const calculateX = (size, offsets, i, j, k) =>
    (j - size + 1 + offsets[k][0]) * cellWidth + Math.abs(i - size + 1) * cellOffsetX;

export const calculateY = (size, offsets, i, k) =>
    (i - size + 1 + offsets[k][1]) * cellOffsetY;
