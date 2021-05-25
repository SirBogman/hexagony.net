import '../css/secondary.scss';
import { applyColorMode, colorModes, parseStorage, prefersDarkColorScheme } from './view/ViewUtil';
import { updateNavigationLinks } from './components/NavigationLinks';

const navigation = document.getElementById('nav')!;

function init() {
    const userData = parseStorage(sessionStorage.userData) ?? parseStorage(localStorage.userData);
    const defaultColorMode = colorModes[Number(prefersDarkColorScheme())];
    applyColorMode(colorModes.includes(userData?.colorMode) ? userData.colorMode : defaultColorMode);
    updateNavigationLinks(navigation);
}

init();
