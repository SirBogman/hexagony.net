export function emptyElement(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}
