import React from 'react';
import PropTypes from 'prop-types';
import { removeWhitespaceAndDebug } from '../hexagony/util.mjs';
import { cellHeight } from './GridShared.jsx';

export class GridCell extends React.PureComponent {
    constructor(props) {
        super(props);
        this.inputRef = React.createRef();
    }

    componentDidUpdate() {
        if (this.props.isFocused) {
            const element = this.inputRef.current;
            // While editing the text, it should always be selected.
            // Otherwise, the user can't type because it's limited to one character and they
            // can't delete the existing character, because it inserts '.'.
            element.select();
        }
    }

    onInput = () => {
        const { i, j, onEditHexagonCharacter } = this.props;
        const newText = removeWhitespaceAndDebug(this.inputRef.current.value) || '.';
        onEditHexagonCharacter(i, j, newText);
        // TODO: Reselect the text so that backspace can work normally.
    }

    onKeyDown = event => {
        const { i, j, onEditHexagonCharacter, onToggleBreakpoint } = this.props;

        if (event.target.selectionStart == event.target.selectionEnd &&
            (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Backspace')) {
            // No text is selected. Let the text input element handle it.
            return;
        }

        if (event.key === 'b' && event.ctrlKey) {
            if (onToggleBreakpoint) {
                onToggleBreakpoint(i, j);
            }
            event.preventDefault();
            return;
        }
        if (event.key === 'Escape') {
            this.props.onBlur();
            event.preventDefault();
            return;
        }
        if (event.key === 'Backspace' || event.key === 'Delete') {
            onEditHexagonCharacter(i, j, '.');
            event.preventDefault();
            return;
        }

        let di = 0, dj = 0;
        if (event.key === 'ArrowLeft' || event.key === 'Tab' && event.shiftKey) {
            if (j > 0) {
                dj = -1;
            }
            else if (i > 0) {
                // TODO: FIX
                //this.navigateTo(i - 1, this.cellPaths[0][i - 1].length - 1, k);
                event.preventDefault();
                return;
            }
            else {
                event.preventDefault();
                return;
            }
        }
        else if (event.key === 'ArrowRight' || event.key === 'Tab' && !event.shiftKey ||
                event.key === 'Enter' && !event.ctrlKey) {
            // if (j < this.cellPaths[0][i].length - 1) {
            //     dj = 1;
            // }
            // else if (i < this.cellPaths[0].length - 1) {
            //     // TODO: FIX
            //     this.navigateTo(i + 1, 0, k);
            //     event.preventDefault();
            //     return;
            // }
            // else {
            //     event.preventDefault();
            //     return;
            // }
        }
        else if (event.key === 'ArrowUp') {
            di = -1;
        }
        else if (event.key === 'ArrowDown') {
            di = 1;
        }
        if (di != 0 || dj != 0) {
            if (di != 0) {
                if (event.shiftKey) {
                    // Move in a straight line with up and down arrows in the top and bottom half.
                    if (i < this.size && di < 0) {
                        dj--;
                    }
                    if (i < this.size - 1 && di > 0) {
                        dj++;
                    }
                }
                else {
                    if (i >= this.size && di < 0) {
                        dj++;
                    }
                    if (i >= this.size - 1 && di > 0) {
                        dj--;
                    }
                }
            }

            //const newI = i + di;
            //const newJ = j + dj;
            // if (newI >= 0 && newI < this.cellPaths[0].length &&
            //     newJ >= 0 && newJ < this.cellPaths[0][newI].length) {
            //     // TODO: FIX
            //     this.navigateTo(newI, newJ, k);
            // }
            // Prevent the selection from being cancelled on key up.
            event.preventDefault();
        }
    };

    onClick = () => {
        this.props.onClick(this.props.i, this.props.j, this.props.k);
    }

    render() {
        const { className, children, delay, isFocused, onBlur, pointAxialString, text, x, y } = this.props;
        let innerContent;

        if (isFocused) {
            const width = 28;
            innerContent =
                <foreignObject
                    x={-width / 2}
                    y={-cellHeight / 2}
                    width={width}
                    height={cellHeight}>
                    <input
                        className="cellInput"
                        autoCapitalize="off"
                        autoComplete="off"
                        spellCheck={false}
                        maxLength={1}
                        onBlur={onBlur}
                        onInput={this.onInput}
                        onKeyDown={this.onKeyDown}
                        ref={this.inputRef}
                        style={{
                            width: `${width}px`,
                            height: `${cellHeight}px`,
                        }}
                        type="text"
                        value={text}/>
                </foreignObject>;
        }
        else {
            innerContent =
                <text className={text === '.' ? 'cellText noop' : 'cellText'} textAnchor="middle" dominantBaseline="central">
                    {text}
                </text>;
        }

        return (
            <g className="cell" onClick={this.onClick} transform={`translate(${x},${y})`}>
                <path className={`cellPath ${className}`} d="M17.32 10v-20L0-20l-17.32 10v20L0 20z"
                    style={{ transitionDuration: delay }}/>
                <title>
                    {`Coordinates: ${pointAxialString}`}
                </title>
                {innerContent}
                {children}
            </g>
        );
    }

    static propTypes = {
        className: PropTypes.string.isRequired,
        children: PropTypes.arrayOf(PropTypes.node),
        delay: PropTypes.number.isRequired,
        i: PropTypes.number.isRequired,
        isFocused: PropTypes.bool.isRequired,
        j: PropTypes.number.isRequired,
        k: PropTypes.number.isRequired,
        onBlur: PropTypes.func.isRequired,
        onClick: PropTypes.func.isRequired,
        onEditHexagonCharacter: PropTypes.func.isRequired,
        onToggleBreakpoint: PropTypes.func.isRequired,
        pointAxialString: PropTypes.string.isRequired,
        text: PropTypes.string.isRequired,
        x: PropTypes.number.isRequired,
        y: PropTypes.number.isRequired,
    };
}
