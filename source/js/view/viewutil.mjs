export function createSvgElement(name) {
    return document.createElementNS('http://www.w3.org/2000/svg', name);
}

export function emptyElement(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

export function setChecked(element, active) {
    element.setAttribute('aria-checked', active ? 'true' : 'false');
}

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
