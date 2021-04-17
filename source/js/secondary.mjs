import '../css/secondary.scss';
import { applyColorMode, colorModes, prefersDarkColorScheme } from './view/viewutil.mjs';
import { updateNavigationLinks } from './components/NavigationLinks.jsx';

function parseStorage(storage) {
    try {
        return JSON.parse(storage);
    }
    catch {
        return null;
    }
}

function init() {
    const userData = parseStorage(sessionStorage.userData) ?? parseStorage(localStorage.userData);
    const defaultColorMode = colorModes[Number(prefersDarkColorScheme())];
    applyColorMode(colorModes.includes(userData?.colorMode) ? userData.colorMode : defaultColorMode);
    updateNavigationLinks(document.getElementById('navigation'));
}

init();
