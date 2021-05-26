export abstract class Direction {
    abstract get reflectAtSlash(): Direction;
    abstract get reflectAtBackslash(): Direction;
    abstract get reflectAtUnderscore(): Direction;
    abstract get reflectAtPipe(): Direction;
    abstract reflectAtLessThan(positive: boolean): Direction;
    abstract reflectAtGreaterThan(positive: boolean): Direction;
    abstract get reverse(): Direction;
    abstract get angle(): number;
    abstract get vector(): [number, number];
}

class NorthEast extends Direction {
    get reflectAtSlash() { return northEast; }
    get reflectAtBackslash() { return west; }
    get reflectAtUnderscore() { return southEast; }
    get reflectAtPipe() { return northWest; }
    reflectAtLessThan() { return southWest; }
    reflectAtGreaterThan() { return east; }
    get reverse() { return southWest; }
    get angle() { return 300; }
    get vector(): [number, number] { return [1, -1]; }
    toString() { return 'NE'; }
}

class NorthWest extends Direction {
    get reflectAtSlash() { return east; }
    get reflectAtBackslash() { return northWest; }
    get reflectAtUnderscore() { return southWest; }
    get reflectAtPipe() { return northEast; }
    reflectAtLessThan() { return west; }
    reflectAtGreaterThan() { return southEast; }
    get reverse() { return southEast; }
    get angle() { return 240; }
    get vector(): [number, number] { return [0, -1]; }
    toString() { return 'NW'; }
}

class West extends Direction {
    get reflectAtSlash() { return southEast; }
    get reflectAtBackslash() { return northEast; }
    get reflectAtUnderscore() { return west; }
    get reflectAtPipe() { return east; }
    reflectAtLessThan() { return east; }
    reflectAtGreaterThan(positive: boolean) { return positive ? northWest : southWest; }
    get reverse() { return east; }
    get angle() { return 180; }
    get vector(): [number, number] { return [-1, 0]; }
    toString() { return 'W'; }
}

class SouthWest extends Direction {
    get reflectAtSlash() { return southWest; }
    get reflectAtBackslash() { return east; }
    get reflectAtUnderscore() { return northWest; }
    get reflectAtPipe() { return southEast; }
    reflectAtLessThan() { return west; }
    reflectAtGreaterThan() { return northEast; }
    get reverse() { return northEast; }
    get angle() { return 120; }
    get vector(): [number, number] { return [-1, 1]; }
    toString() { return 'SW'; }
}

class SouthEast extends Direction {
    get reflectAtSlash() { return west; }
    get reflectAtBackslash() { return southEast; }
    get reflectAtUnderscore() { return northEast; }
    get reflectAtPipe() { return southWest; }
    reflectAtLessThan() { return northWest; }
    reflectAtGreaterThan() { return east; }
    get reverse() { return northWest; }
    get angle() { return 60; }
    get vector(): [number, number] { return [0, 1]; }
    toString() { return 'SE'; }
}

class East extends Direction {
    get reflectAtSlash() { return northWest; }
    get reflectAtBackslash() { return southWest; }
    get reflectAtUnderscore() { return east; }
    get reflectAtPipe() { return west; }
    reflectAtLessThan(positive: boolean) { return positive ? southEast : northEast; }
    reflectAtGreaterThan() { return west; }
    get reverse() { return west; }
    get angle() { return 0; }
    get vector(): [number, number] { return [1, 0]; }
    toString() { return 'E'; }
}

export const east = new East();
export const west = new West();
export const northWest = new NorthWest();
export const northEast = new NorthEast();
export const southWest = new SouthWest();
export const southEast = new SouthEast();
