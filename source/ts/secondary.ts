import '../styles/secondary.scss';
import { applyColorMode, assertNotNull, colorModes, parseStorage, prefersDarkColorScheme } from './view/ViewUtil';
import { updateAbout } from './components/About';
import { updateNavigationLinks } from './components/NavigationLinks';

function init() {
    const userData = parseStorage(sessionStorage.userData) ?? parseStorage(localStorage.userData);
    const defaultColorMode = colorModes[Number(prefersDarkColorScheme())];
    const colorMode = colorModes.includes(userData?.colorMode) ? userData.colorMode : defaultColorMode;
    applyColorMode(colorMode);
    updateNavigationLinks(assertNotNull(document.getElementById('nav'), 'nav'));

    if (location.pathname === '/about.html') {
        // Keeping the navigation links separate from this component makes it easier for the header to span the full
        // width of the page.
        updateAbout(assertNotNull(document.getElementById('app'), 'app'), colorMode);
    }
}

init();
