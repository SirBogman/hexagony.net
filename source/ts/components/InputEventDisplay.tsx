import React from 'react';

import { emptyElement, getControlKey } from '../view/ViewUtil';

import '../../styles/InputEventDisplay.scss';

/**
 * Used to display input events in recorded videos.
 * Events may be missed if Event.stopPropagation is used.
 */
export class InputEventDisplay extends React.PureComponent {
    private readonly divRef: React.RefObject<HTMLDivElement> = React.createRef();
    private readonly spanRef: React.RefObject<HTMLSpanElement> = React.createRef();

    componentDidMount(): void {
        document.addEventListener('keydown', this.onKeyDown);
        document.addEventListener('mousedown', this.onMouseDown);
        document.addEventListener('mouseup', this.onMouseUp);
        document.addEventListener('wheel', this.onWheel);
    }

    componentWillUnmount(): void {
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('mousedown', this.onMouseDown);
        document.removeEventListener('mouseup', this.onMouseUp);
        document.removeEventListener('wheel', this.onWheel);
    }

    private updateText(text: string): void {
        const div = this.divRef.current;
        if (div !== null) {
            // Remove any previous text and add new text. This will reset its animation.
            emptyElement(div);
            const span = document.createElement('span');
            span.textContent = text;
            span.classList.add('inputEventDisplay');
            div.appendChild(span);
        }
    }

    private onMouseDown = (e: MouseEvent): void =>
        this.updateText(`Mouse: ${e.button === 0 ? 'Left' : e.button} Down`);

    private onMouseUp = (e: MouseEvent): void =>
        this.updateText(`Mouse: ${e.button === 0 ? 'Left' : e.button} Up`);

    private onWheel = (e: WheelEvent): void =>
        this.updateText(`Wheel: ${e.deltaY > 0 ? 'Down' : 'Up'}`);

    private onKeyDown = (e: KeyboardEvent): void => {
        if (e.key !== 'Control' && e.key !== 'Shift') {
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
            this.updateText(`Key: ${prefix}${key}`);
        }
    }

    render(): JSX.Element {
        return <div className="inputEventDisplay" ref={this.divRef}/>;
    }
}
