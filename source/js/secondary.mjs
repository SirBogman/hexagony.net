import '../css/secondary.scss';
import { applyColorMode, colorModes, prefersDarkColorScheme } from './view/viewutil.mjs';

function parseStorage(storage) {
    try {
        return JSON.parse(storage);
    }
    // eslint-disable-next-line no-empty
    catch {
        return null;
    }
}

function init() {
    const userData = parseStorage(sessionStorage.userData) ?? parseStorage(localStorage.userData);
    const defaultColorMode = colorModes[Number(prefersDarkColorScheme())];
    applyColorMode(colorModes.includes(userData?.colorMode) ? userData.colorMode : defaultColorMode);
}

init();
