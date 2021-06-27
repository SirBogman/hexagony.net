import { assertNotNull } from '../view/ViewUtil';

export type DirectionString = 'NW' | 'NE' | 'W' | 'E' | 'SW' | 'SE';

export abstract class Direction {
    abstract get reflectAtSlash(): Direction;
    abstract get reflectAtBackslash(): Direction;
    abstract get reflectAtUnderscore(): Direction;
    abstract get reflectAtPipe(): Direction;
    abstract reflectAtLessThan(positive: boolean): Direction;
    abstract reflectAtGreaterThan(positive: boolean): Direction;
    abstract get reverse(): Direction;
    abstract get rotateClockwise(): Direction;
    abstract get angle(): number;
    abstract get vector(): readonly [number, number];

    abstract toString(): DirectionString;

    static tryParse(value: string): Direction | null {
        switch (value) {
            case 'NE': return northEast;
            case 'NW': return northWest;
            case 'W': return west;
            case 'SW': return southWest;
            case 'SE': return southEast;
            case 'E': return east;
        }
        return null;
    }

    static fromString(value: DirectionString): Direction {
        return assertNotNull(Direction.tryParse(value), 'Direction.fromString');
    }
}

export class NorthEast extends Direction {
    get reflectAtSlash(): Direction { return northEast; }
    get reflectAtBackslash(): Direction { return west; }
    get reflectAtUnderscore(): Direction { return southEast; }
    get reflectAtPipe(): Direction { return northWest; }
    reflectAtLessThan(): Direction { return southWest; }
    reflectAtGreaterThan(): Direction { return east; }
    get reverse(): Direction { return southWest; }
    get rotateClockwise(): Direction { return east; }
    get angle(): number { return 300; }
    get vector(): readonly [number, number] { return [1, -1]; }
    toString(): 'NE' { return 'NE'; }
}

export class NorthWest extends Direction {
    get reflectAtSlash(): Direction { return east; }
    get reflectAtBackslash(): Direction { return northWest; }
    get reflectAtUnderscore(): Direction { return southWest; }
    get reflectAtPipe(): Direction { return northEast; }
    reflectAtLessThan(): Direction { return west; }
    reflectAtGreaterThan(): Direction { return southEast; }
    get reverse(): Direction { return southEast; }
    get rotateClockwise(): Direction { return northEast; }
    get angle(): number { return 240; }
    get vector(): readonly [number, number] { return [0, -1]; }
    toString(): 'NW' { return 'NW'; }
}

export class West extends Direction {
    get reflectAtSlash(): Direction { return southEast; }
    get reflectAtBackslash(): Direction { return northEast; }
    get reflectAtUnderscore(): Direction { return west; }
    get reflectAtPipe(): Direction { return east; }
    reflectAtLessThan(): Direction { return east; }
    reflectAtGreaterThan(positive: boolean): Direction { return positive ? northWest : southWest; }
    get reverse(): Direction { return east; }
    get rotateClockwise(): Direction { return northWest; }
    get angle(): number { return 180; }
    get vector(): readonly [number, number] { return [-1, 0]; }
    toString(): 'W' { return 'W'; }
}

export class SouthWest extends Direction {
    get reflectAtSlash(): Direction { return southWest; }
    get reflectAtBackslash(): Direction { return east; }
    get reflectAtUnderscore(): Direction { return northWest; }
    get reflectAtPipe(): Direction { return southEast; }
    reflectAtLessThan(): Direction { return west; }
    reflectAtGreaterThan(): Direction { return northEast; }
    get reverse(): Direction { return northEast; }
    get rotateClockwise(): Direction { return west; }
    get angle(): number { return 120; }
    get vector(): readonly [number, number] { return [-1, 1]; }
    toString(): 'SW' { return 'SW'; }
}

export class SouthEast extends Direction {
    get reflectAtSlash(): Direction { return west; }
    get reflectAtBackslash(): Direction { return southEast; }
    get reflectAtUnderscore(): Direction { return northEast; }
    get reflectAtPipe(): Direction { return southWest; }
    reflectAtLessThan(): Direction { return northWest; }
    reflectAtGreaterThan(): Direction { return east; }
    get reverse(): Direction { return northWest; }
    get rotateClockwise(): Direction { return southWest; }
    get angle(): number { return 60; }
    get vector(): readonly [number, number] { return [0, 1]; }
    toString(): 'SE' { return 'SE'; }
}

export class East extends Direction {
    get reflectAtSlash(): Direction { return northWest; }
    get reflectAtBackslash(): Direction { return southWest; }
    get reflectAtUnderscore(): Direction { return east; }
    get reflectAtPipe(): Direction { return west; }
    reflectAtLessThan(positive: boolean): Direction { return positive ? southEast : northEast; }
    reflectAtGreaterThan(): Direction { return west; }
    get reverse(): Direction { return west; }
    get rotateClockwise(): Direction { return southEast; }
    get angle(): number { return 0; }
    get vector(): readonly [number, number] { return [1, 0]; }
    toString(): 'E' { return 'E'; }
}

export const east = new East();
export const west = new West();
export const northWest = new NorthWest();
export const northEast = new NorthEast();
export const southWest = new SouthWest();
export const southEast = new SouthEast();
