import React from 'react';
import { EdgeTraversal } from '../hexagony/HexagonyState';
import { getRowSize } from '../hexagony/Util';
import { DictionaryOfLists } from '../view/DictionaryOfLists';
import { assertDefined, assertNotNull } from '../view/ViewUtil';
import { calculateX, calculateY, cellOffsetX, cellOffsetY, cellWidth, edgeLength, getHexagonOffsets } from './GridShared';

type GridEdgeConnectorsProps = {
    centerX: number;
    centerY: number;
    delay: string;
    size: number;
};

export class GridEdgeConnectors extends React.PureComponent<GridEdgeConnectorsProps> {
    private edgeConnectors = new DictionaryOfLists<string>();
    private edgeConnectors2 = new DictionaryOfLists<string>();
    private allEdgeConnectors = new Map<string, SVGElement>();

    private setRefs = (key: string, name1: string, name2: string, isSecondary: boolean, connector: SVGElement | null): void => {
        const collection = isSecondary ? this.edgeConnectors2 : this.edgeConnectors;
        if (connector) {
            this.allEdgeConnectors.set(key, connector);
            collection.add(name1, key);
            collection.add(name2, key);
        }
        else {
            this.allEdgeConnectors.delete(key);
            collection.remove(name1, key);
            collection.remove(name2, key);
        }
    };

    private playAnimationHelper(connectors: string[] | undefined, name: string): void {
        if (connectors) {
            for (const key of connectors) {
                let connector = assertDefined(this.allEdgeConnectors.get(key), 'connector');
                if (connector.nodeName !== 'path') {
                    connector = assertNotNull(connector.firstElementChild as SVGElement, 'firstElementChild');
                }
                connector.classList.add(name);
                connector.style.animationDuration = this.props.delay;
            }
        }
    }

    public playEdgeAnimation({ edgeName, isBranch }: EdgeTraversal): void {
        const name = isBranch ? 'connectorFlash' : 'connectorNeutralFlash';
        this.playAnimationHelper(this.edgeConnectors.getValues(edgeName), name);
        this.playAnimationHelper(this.edgeConnectors2.getValues(edgeName), `${name}Secondary`);
    }

    render(): JSX.Element {
        const { centerX, centerY, size } = this.props;

        const horizontalConnectorsLimit = size;
        const verticalConnectorsLimit = -size;
        const offsets = getHexagonOffsets(size);
        const getX = (i: number, j: number, k: number) => centerX + calculateX(size, offsets, i, j, k);
        const getY = (i: number, k: number) => centerY + calculateY(size, offsets, i, k);

        const connectors: JSX.Element[] = [];
        const positiveConnectors: JSX.Element[] = [];

        const createNegativeConnector = (transform: string, key: string, name1: string, name2: string, isSecondary: boolean) => connectors.push(
            <g className="negativeConnector"
                key={key}
                ref={connector => this.setRefs(key, name1, name2, isSecondary, connector)}
                transform={transform}>
                <path className="connector" d="M0 0h3.76c2.45 0 4.9 1.98 4.9 4.43v21.14c0 2.45 1.52 4.43 3.96 4.43h4.7"/>
                <text className="negativeText" textAnchor="middle" transform="matrix(0 .6 -.6 0 1 5)">-</text>
            </g>);

        const createNeutralConnector = (transform: string, key: string, name1: string, name2: string, isSecondary: boolean) => connectors.push(
            <path className="neutralConnector connector"
                d="M0 0h3.76c2.45 0 4.9 1.98 4.9 4.43v21.14c0 2.45 1.52 4.43 3.96 4.43h4.7"
                key={key}
                ref={connector => this.setRefs(key, name1, name2, isSecondary, connector)}
                transform={transform}/>);

        const createPositiveConnector = (transform: string, key: string, name1: string, name2: string, isSecondary: boolean) => positiveConnectors.push(
            <g className="positiveConnector"
                key={key}
                ref={connector => this.setRefs(key, name1, name2, isSecondary, connector)}
                transform={transform}>
                <path className="connector" d="M0 0h3.76c2.45 0 4.9 1.98 4.9 4.43v21.14c0 2.45 1.52 4.43 3.96 4.43h4.7"/>
                <text className="positiveText" textAnchor="middle" transform="matrix(0 .6 -.6 0 0 5)">+</text>
            </g>);

        for (let k = 0; k < offsets.length; k++) {
            for (let i = 0; i < size; i++) {
                const leftEnd = i === 0;
                const rightEnd = i === size - 1;
                const isSpecial = leftEnd || rightEnd;
                let cellX, cellY, scaleX, scaleY;

                // Top edge.
                if (offsets[k][1] > verticalConnectorsLimit) {
                    cellX = getX(0, i, k) + 0.5 * cellOffsetX;
                    cellY = getY(0, k) - 0.75 * edgeLength;
                    scaleX = 1;
                    scaleY = -1;
                    if (i === 0) {
                        // Move the symbol to the opposite end of the connector.
                        cellX -= cellOffsetX;
                        cellY -= cellOffsetY;
                        scaleX *= -1;
                        scaleY *= -1;
                    }
                    const isSecondary = k !== 0 && offsets[k][2] !== 'S';
                    (isSpecial ? createPositiveConnector : createNeutralConnector)(
                        `translate(${cellX},${cellY})scale(${scaleX},${scaleY})rotate(60)`,
                        `top_1_${k}_${i}`,
                        `${i},${-size + 1},NE,${rightEnd ? '+' : '0'}`,
                        `${i + 1 - size},${size - 1},SW,${leftEnd ? '+' : '0'}`,
                        isSecondary);

                    cellX = getX(0, i, k) + 0.5 * cellOffsetX;
                    cellY = getY(0, k) - cellOffsetY - 0.75 * edgeLength;
                    scaleX = scaleY = -1;
                    if (i === 0) {
                        cellX -= cellOffsetX;
                        cellY += cellOffsetY;
                        scaleX = scaleY *= -1;
                    }
                    (isSpecial ? createNegativeConnector : createNeutralConnector)(
                        `translate(${cellX},${cellY})scale(${scaleX},${scaleY})rotate(240)`,
                        `top_2_${k}_${i}`,
                        `${i},${-size + 1},NW,${leftEnd ? '-' : '0'}`,
                        `${i + 1 - size},${size - 1},SE,${rightEnd ? '-' : '0'}`,
                        isSecondary);
                }

                if (offsets[k][0] < horizontalConnectorsLimit && offsets[k][1] >= verticalConnectorsLimit) {
                    // North east edge
                    cellX = getX(i, getRowSize(size, i) - 1, k) + cellOffsetX;
                    cellY = getY(i, k);
                    scaleX = 1;
                    scaleY = -1;
                    if (i === 0) {
                        cellX += cellOffsetX;
                        cellY -= cellOffsetY;
                        scaleX *= -1;
                        scaleY *= -1;
                    }
                    const isSecondary = k !== 0 && offsets[k][2] !== 'SW';
                    (isSpecial ? createPositiveConnector : createNeutralConnector)(
                        `translate(${cellX},${cellY})scale(${scaleX},${scaleY})`,
                        `NE_1_${k}_${i}`,
                        `${size - 1},${i + 1 - size},E,${rightEnd ? '+' : '0'}`,
                        `${-size + 1},${i},W,${leftEnd ? '+' : '0'}`,
                        isSecondary);

                    cellX = getX(i, getRowSize(size, i) - 1, k) + cellWidth + 0.5 * cellOffsetX;
                    cellY = getY(i, k) - 0.75 * edgeLength;
                    scaleX = scaleY = -1;
                    if (i === 0) {
                        cellX -= cellWidth;
                        scaleX = scaleY *= -1;
                    }
                    (isSpecial ? createNegativeConnector : createNeutralConnector)(
                        `translate(${cellX},${cellY})scale(${scaleX},${scaleY})rotate(300)`,
                        `NE_2_${k}_${i}`,
                        `${size - 1},${i + 1 - size},NE,${leftEnd ? '-' : '0'}`,
                        `${-size + 1},${i},SW,${rightEnd ? '-' : '0'}`,
                        isSecondary);
                }

                if (offsets[k][0] < horizontalConnectorsLimit && offsets[k][1] <= -verticalConnectorsLimit) {
                    // South east edge
                    const a = i + size - 1;
                    cellX = getX(a, getRowSize(size, a) - 1, k) + 0.5 * cellOffsetX;
                    cellY = getY(a, k) + 0.75 * edgeLength;
                    scaleX = 1;
                    scaleY = -1;
                    if (i === 0) {
                        cellX += cellWidth;
                        scaleX *= -1;
                        scaleY *= -1;
                    }
                    const isSecondary = k !== 0 && offsets[k][2] !== 'NW';
                    (isSpecial ? createPositiveConnector : createNeutralConnector)(
                        `translate(${cellX},${cellY})scale(${scaleX},${scaleY})rotate(300)`,
                        `SE_1_${k}_${i}`,
                        `${size - 1 - i},${i},SE,${rightEnd ? '+' : '0'}`,
                        `${-i},${i - size + 1},NW,${leftEnd ? '+' : '0'}`,
                        isSecondary);

                    cellX = getX(a, getRowSize(size, a) - 1, k) + cellWidth;
                    cellY = getY(a, k) + cellOffsetY;
                    scaleX = scaleY = -1;
                    if (i === 0) {
                        cellX -= cellOffsetX;
                        cellY -= cellOffsetY;
                        scaleX = scaleY *= -1;
                    }
                    (isSpecial ? createNegativeConnector : createNeutralConnector)(
                        `translate(${cellX},${cellY})scale(${scaleX},${scaleY})`,
                        `SE_2_${k}_${i}`,
                        `${size - 1 - i},${i},E,${leftEnd ? '-' : '0'}`,
                        `${-i},${i - size + 1},W,${rightEnd ? '-' : '0'}`,
                        isSecondary);
                }
            }
        }

        // Top level group (g) helps to prevent the list of children for its parent component from being as long.
        // Positive connectors crossover negative ones and render on top.
        return (
            <g>
                {connectors}
                {positiveConnectors}
            </g>
        );
    }
}
