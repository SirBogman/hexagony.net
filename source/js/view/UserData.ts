import LZString from 'lz-string';
import { SourceCode } from '../hexagony/SourceCode';
import { assertNotNull, colorModes, parseStorage, prefersDarkColorScheme } from './ViewUtil';

import { inputModeArguments, isValidInputMode } from '../components/InputPanel';

const fibonacciExample = ')="/}.!+/M8;';
const helloWorldExample = 'H;e;/;o;W@>r;l;l;;o;Q\\;0P;2<d;P1;';

export interface IHashData {
    code: string;
    link: string;
    input?: string;
    inputMode?: string;
}

export interface IUserData {
    breakpoints: string[];
    code: string;
    colorMode: string;
    colorOffset: number;
    delay: number;
    directionalTyping: boolean;
    edgeTransitionMode: boolean;
    input: string;
    inputMode: string; // TODO: enum?
    showArrows: boolean;
    showIPs: boolean;
    utf8Output: boolean;
}

function sanitizeString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
}

function sanitizeInputMode(value: unknown): string | undefined {
    return typeof value === 'string' && isValidInputMode(value) ? value : undefined;
}

export function clearLocationHash(): void {
    // After consuming the hash, move the URL to the export box and remove it from the location.
    // Otherwise, changes in localStorage would be overwritten when reloading the page.
    // For some reason, calling replaceState while in the constructor of a React component
    // can cause the page to reload, so delay it until the next event cycle.
    window.setTimeout(() => history.replaceState(null, '', '/'));
}

export function loadHashData() : IHashData | null {
    const link = location.href;

    if (location.hash.startsWith('#lz')) {
        try {
            if (location.hash) {
                const decompressed = LZString.decompressFromBase64(location.hash.slice(3));
                const data = JSON.parse(assertNotNull(decompressed, 'decompressed'));
                if (data && typeof data.code === 'string') {
                    return {
                        code: data.code,
                        inputMode: sanitizeInputMode(data.inputMode),
                        input: sanitizeString(data.input),
                        link,
                    };
                }
            }
        }
        // eslint-disable-next-line no-empty
        catch (e) {
        }
    }
    else if (location.hash === '#fibonacci') {
        return {
            code: fibonacciExample,
            link,
        };
    }
    else if (location.hash === '#helloworld') {
        return {
            code: SourceCode.fromString(helloWorldExample).layoutCode(),
            link,
        };
    }

    return null;
}

export function generateLink(code: string, input: string, inputMode: string): string {
    const json = JSON.stringify({ code, input, inputMode });
    return `${location.origin}/#lz${LZString.compressToBase64(json)}`;
}

function sanitizeNumber(value: unknown, defaultValue: number): number {
    return typeof value === 'number' ? value : defaultValue;
}

function sanitizeBool(value: unknown, defaultValue: boolean): boolean {
    return typeof value === 'boolean' ? value : defaultValue;
}

export function loadUserData() : IUserData {
    let userData = parseStorage(sessionStorage.userData);

    if (!userData?.code) {
        userData = parseStorage(localStorage.userData);
        // This is a new tab. Copy its state to sessionStorage so that it will be
        // independent of existing tabs.
        sessionStorage.userData = localStorage.userData;
    }

    if (!userData?.code || typeof userData.code !== 'string') {
        userData = { code: SourceCode.fromString(helloWorldExample).layoutCode() };
    }

    const defaultColorMode = colorModes[Number(prefersDarkColorScheme())];
    return {
        code: userData.code,
        delay: sanitizeNumber(userData.delay, 250),
        directionalTyping: sanitizeBool(userData.directionalTyping, false),
        breakpoints: userData.breakpoints ?? [],
        colorMode: colorModes.includes(userData.colorMode) ? userData.colorMode : defaultColorMode,
        colorOffset: sanitizeNumber(userData.colorOffset, 0),
        input: sanitizeString(userData.input) ?? '',
        inputMode: sanitizeInputMode(userData.inputMode) ?? inputModeArguments,
        utf8Output: sanitizeBool(userData.utf8Output, true),
        edgeTransitionMode: sanitizeBool(userData.edgeTransitionMode, true),
        showArrows: sanitizeBool(userData.showArrows, false),
        showIPs: sanitizeBool(userData.showIPs, false),
    };
}

export function saveUserData(userData: IUserData): void {
    const serializedData = JSON.stringify(userData);
    sessionStorage.userData = serializedData;
    localStorage.userData = serializedData;
}
