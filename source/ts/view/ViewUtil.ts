export function assertDefined<T>(value: T | undefined, name: string): T {
    if (value === undefined) {
        throw new Error(`internal error: unexpected undefined value: ${name}`);
    }

    return value;
}

export function assertNotNull<T>(value: T | null, name: string): T {
    if (value === null) {
        throw new Error(`internal error: unexpected null value: ${name}`);
    }

    return value;
}

export function getControlKey(keyboardEvent: KeyboardEvent): boolean {
    // Allow the use of the meta key (cmd on macOS) wherever ctrl is used.
    return keyboardEvent.ctrlKey || keyboardEvent.metaKey;
}

export function createSvgElement(name: string): SVGElement {
    return document.createElementNS('http://www.w3.org/2000/svg', name);
}

export function emptyElement(element: Node): void {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

export function unicodeStringToBase64(value: string): string {
    const utf8 = String.fromCharCode(...new TextEncoder().encode(value));
    return btoa(utf8);
}

export function base64ToUnicodeString(value: string): string {
    const decoded = atob(value);
    const array = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
        array[i] = decoded.charCodeAt(i);
    }
    return new TextDecoder().decode(array);
}

export function parseBreakpoint(id: string): readonly number[] {
    return id.split(',').map(Number);
}

export function prefersDarkColorScheme(): boolean {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyColorMode(colorMode: string): void {
    document.documentElement.classList.toggle('darkMode', colorMode === darkColorMode);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseStorage(storage: string | undefined): any | null {
    if (!storage) {
        return null;
    }
    try {
        return JSON.parse(storage);
    }
    catch {
        return null;
    }
}

export const darkColorMode = 'Dark';
export const colorModes = ['Light', darkColorMode];
