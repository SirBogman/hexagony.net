import React from 'react';

import { getControlKey } from '../view/ViewUtil';

import '../../styles/InputEventDisplay.scss';

/**
 * Used to display input events in recorded videos.
 * Events may be missed if Event.stopPropagation is used.
 */
export class InputEventDisplay extends React.PureComponent {
    private spanRef: React.RefObject<HTMLSpanElement> = React.createRef();

    componentDidMount(): void {
        document.addEventListener('keydown', this.onKeyDown);
        document.addEventListener('mousedown', this.onMouseDown);
    }

    componentWillUnmount(): void {
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('mousedown', this.onMouseDown);
    }

    private onAnimationEnd = (): void => {
        this.spanRef.current?.classList.remove('inputEventDisplayAnimate');
    }

    private onMouseDown = (e: MouseEvent): void => {
        const span = this.spanRef.current;
        if (span !== null) {
            span.textContent = `Mouse: ${e.button === 0 ? 'Left' : e.button} Click`;
            span.classList.add('inputEventDisplayAnimate');
        }
    }

    private onKeyDown = (e: KeyboardEvent): void => {
        const span = this.spanRef.current;
        if (span !== null && (e.key !== 'Control' && e.key !== 'Shift')) {
            let prefix = '';
            if (getControlKey(e)) {
                prefix = 'Control + ';
            }
            if (e.shiftKey) {
                prefix += 'Shift + ';
            }
            let key = e.key === ' ' ? 'Space' : e.key;
            if (key === 'Escape') {
                key = '';
            }
            span.textContent = `Key: ${prefix}${key}`;
            span.classList.add('inputEventDisplayAnimate');
        }
    }

    render(): JSX.Element {
        return (
            <div className="inputEventDisplay">
                <span className="inputEventDisplay" ref={this.spanRef} onAnimationEnd={this.onAnimationEnd}/>
            </div>
        );
    }
}
