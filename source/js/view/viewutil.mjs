export function unicodeStringToBase64(value) {
    const utf8 = String.fromCharCode(...new TextEncoder().encode(value));
    return btoa(utf8);
}

export function base64ToUnicodeString(value) {
    const decoded = atob(value);
    const array = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
        array[i] = decoded.charCodeAt(i);
    }
    return new TextDecoder().decode(array);
}

export function parseBreakpoint(id) {
    return id.split(',').map(Number);
}

export function prefersDarkColorScheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyColorMode(colorMode) {
    document.documentElement.classList.toggle('darkMode', colorMode == darkColorMode);
}

export const darkColorMode = 'Dark';
export const colorModes = ['Light', darkColorMode];
