import '../css/secondary.scss';
import { applyColorMode, colorModes, prefersDarkColorScheme } from './view/viewutil.mjs';

function init() {
    let userData = undefined;
    try {
        userData = JSON.parse(localStorage.userData);
    }
    // eslint-disable-next-line no-empty
    catch {
    }

    const defaultColorMode = colorModes[Number(prefersDarkColorScheme())];
    applyColorMode(colorModes.includes(userData.colorMode) ? userData.colorMode : defaultColorMode);
}

init();
