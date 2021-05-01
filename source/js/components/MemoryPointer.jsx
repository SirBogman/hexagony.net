import React from 'react';
import PropTypes from 'prop-types';
import { edgeLength } from './MemoryHexagonGrid.jsx';

const fatEndWidth = 6 * edgeLength / 46.24;
const path = `M0${-edgeLength / 2}l${-fatEndWidth / 2} ${edgeLength}h${fatEndWidth}z`;

// Calculate new rotation angle to avoid spinning when using CSS transition.
function smoothRotation(oldRotation, newRotation) {
    let delta = (newRotation - oldRotation) % 360;
    if (delta > 180) {
        delta -= 360;
    }
    if (delta < -180) {
        delta += 360;
    }
    return oldRotation + delta;
}

export class MemoryPointer extends React.PureComponent {
    constructor(props) {
        super(props);
        this.rotation = 0;
    }

    render() {
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

    static propTypes = {
        x: PropTypes.number.isRequired,
        y: PropTypes.number.isRequired,
        angle: PropTypes.number.isRequired,
        delay: PropTypes.string.isRequired,
    };
}
