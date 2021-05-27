import '../css/secondary.scss';
import { applyColorMode, assertNotNull, colorModes, parseStorage, prefersDarkColorScheme } from './view/ViewUtil';
import { updateNavigationLinks } from './components/NavigationLinks';

function init() {
    const navigation = assertNotNull(document.getElementById('nav'), 'nav');
    const userData = parseStorage(sessionStorage.userData) ?? parseStorage(localStorage.userData);
    const defaultColorMode = colorModes[Number(prefersDarkColorScheme())];
    applyColorMode(colorModes.includes(userData?.colorMode) ? userData.colorMode : defaultColorMode);
    updateNavigationLinks(navigation);
}

init();
