export function emptyElement(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

export function setClass(element, className, shouldHaveClass) {
    if (shouldHaveClass) {
        element.classList.add(className);
    }
    else {
        element.classList.remove(className);
    }
}
