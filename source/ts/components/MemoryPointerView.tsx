import React from 'react';
import { edgeLength, halfEdgeLength } from './MemoryHexagonGrid';

const fatEndWidth = 6 * edgeLength / 46.24;

// path is a vertical line
const path = `M0${-halfEdgeLength}l${-fatEndWidth / 2} ${edgeLength}h${fatEndWidth}z`;

export function getMPEndpoints(x: number, y: number, angle: number):
    readonly [readonly [number, number], readonly [number, number]] {
    const radians = angle * Math.PI / 180;
    const dx = -Math.sin(radians) * halfEdgeLength;
    const dy = Math.cos(radians) * halfEdgeLength;
    return [
        [x + dx, y + dy],
        [x - dx, y - dy],
    ];
}

// Calculate new rotation angle to avoid spinning when using CSS transition.
function smoothRotation(oldRotation: number, newRotation: number) {
    let delta = (newRotation - oldRotation) % 360;
    if (delta > 180) {
        delta -= 360;
    }
    if (delta < -180) {
        delta += 360;
    }
    return oldRotation + delta;
}

interface IMemoryPointerViewProps {
    x: number;
    y: number;
    angle: number;
    delay: string;
}

export class MemoryPointerView extends React.PureComponent<IMemoryPointerViewProps> {
    rotation = 0;

    render(): JSX.Element {
        const { x, y, angle, delay } = this.props;
        this.rotation = smoothRotation(this.rotation, angle);
        return <path id="memoryPointer"
            d={path}
            style={{
                transform: `translate(${x.toFixed(2)}px,${y.toFixed(2)}px)rotate(${this.rotation}deg)`,
                transitionDuration: delay,
            }}
        />;
    }
}
