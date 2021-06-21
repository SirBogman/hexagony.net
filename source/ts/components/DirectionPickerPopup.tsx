import classNames from 'classnames';
import React from 'react';
import { useDropdownMenu } from 'react-overlays';

import '../../styles/DirectionPickerPopup.scss';

import { Direction, east, northEast, northWest, southEast, southWest, west } from '../hexagony/Direction';

interface IDirectionPickerButtonProps {
    activeDirection: Direction | null;
    direction: Direction;
    onClick: (value: Direction, event: React.SyntheticEvent) => void;
    polygonPoints: string;
}

interface IDirectionPickerProps {
    direction: Direction | null;
    directionalTyping: boolean;
    onTypingDirectionChanged: (value: Direction) => void;
    toggleDirectionalTyping: () => void;
}

const DirectionPickerButton: React.FC<IDirectionPickerButtonProps> = ({
    activeDirection,
    direction,
    onClick,
    polygonPoints
}) =>
    <button
        aria-label={`${direction.toString()} Typing Direction`}
        aria-checked={activeDirection === direction}
        className="directionPickerButton"
        onClick={event => onClick(direction, event)}
        title={`Set typing direction to ${direction.toString()}`}>
        <svg viewBox="0 0 50 26" width="100" height="52">
            <rect fill="transparent" height="26" width="50"/>
            <polygon fill="currentColor" points={polygonPoints}/>
        </svg>
    </button>;

export const DirectionPickerPopup: React.FC<IDirectionPickerProps> = ({
    direction,
    directionalTyping,
    onTypingDirectionChanged,
    toggleDirectionalTyping
}) => {
    // menuProps may include: ref,aria-labelledby,data-popper-reference-hidden,data-popper-escaped,
    // data-popper-placement,style.
    const [menuProps, { show, toggle }] = useDropdownMenu({
        flip: true,
        offset: [0, 0],
    });

    const closeMenu = (event: React.SyntheticEvent) => toggle?.(false, event);

    const onClick = (direction: Direction, event: React.SyntheticEvent) => {
        onTypingDirectionChanged(direction);
        if (!directionalTyping) {
            toggleDirectionalTyping();
        }
        closeMenu(event);
    };

    const disableDirectionalTyping = (event: React.SyntheticEvent) => {
        toggleDirectionalTyping();
        closeMenu(event);
    };

    return (
        <div
            className={classNames('directionPickerContainer', { hidden: !show })}
            role="menu"
            {...menuProps}>
            <svg className="directionPickerHexagon" viewBox="0 0 100 78">
                <polygon
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3px"
                    points="31 28.03 31 49.97 50 60.94 69 49.97 69 28.03 50 17.06 31 28.03"/>
                {/* The letter T */}
                <path fill="currentColor" d="M52,32V49.21H48V32H42.44v-3.2H57.56V32Z"/>
            </svg>
            <DirectionPickerButton
                activeDirection={direction}
                direction={northWest}
                key="NW"
                onClick={onClick}
                polygonPoints="34 11.29 29.25 23.27 46.75 13.16 34 11.29"/>
            <DirectionPickerButton
                activeDirection={direction}
                direction={northEast}
                key="NE"
                onClick={onClick}
                polygonPoints="16 11.29 3.25 13.16 20.75 23.27 16 11.29"/>
            <DirectionPickerButton
                activeDirection={direction}
                direction={west}
                key="W"
                onClick={onClick}
                polygonPoints="18 13 26 23.1 26 2.9 18 13"/>
            <DirectionPickerButton
                activeDirection={direction}
                direction={east}
                key="E"
                onClick={onClick}
                polygonPoints="32 13 24 2.9 24 23.1 32 13"/>
            <DirectionPickerButton
                activeDirection={direction}
                direction={southWest}
                key="SW"
                onClick={onClick}
                polygonPoints="34 14.71 46.75 12.84 29.25 2.73 34 14.71"/>
            <DirectionPickerButton
                activeDirection={direction}
                direction={southEast}
                key="SE"
                onClick={onClick}
                polygonPoints="16 14.71 20.75 2.73 3.25 12.84 16 14.71"/>
            <button
                role="switch"
                aria-label="Disable Directional Typing"
                className="directionalTypingOffButton"
                disabled={!directionalTyping}
                onClick={disableDirectionalTyping}
                title={`${directionalTyping ? 'Disable' : 'Enable'} Directional Typing`}>
                Disable Directional Typing
            </button>
        </div>
    );
};
