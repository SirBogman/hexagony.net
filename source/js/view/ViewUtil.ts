export function createSvgElement(name: string) {
    return document.createElementNS('http://www.w3.org/2000/svg', name);
}

export function emptyElement(element: Node) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

export function getControlKey(keyboardEvent: KeyboardEvent) {
    // Allow the use of the meta key (cmd on macOS) wherever ctrl is used.
    return keyboardEvent.ctrlKey || keyboardEvent.metaKey;
}

export function unicodeStringToBase64(value: string) {
    const utf8 = String.fromCharCode(...new TextEncoder().encode(value));
    return btoa(utf8);
}

export function base64ToUnicodeString(value: string) {
    const decoded = atob(value);
    const array = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
        array[i] = decoded.charCodeAt(i);
    }
    return new TextDecoder().decode(array);
}

export function prefersDarkColorScheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyColorMode(colorMode: string) {
    document.documentElement.classList.toggle('darkMode', colorMode == darkColorMode);
}

export function parseStorage(storage: string | undefined) {
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
