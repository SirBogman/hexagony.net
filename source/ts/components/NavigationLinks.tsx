import React from 'react';
import ReactDOM from 'react-dom';
import classNames from 'classnames';

export function updateNavigationLinks(element: HTMLElement): void {
    ReactDOM.render(
        <React.StrictMode><NavigationLinks/></React.StrictMode>,
        element);
}

const NavigationLinksFunction: React.FC = () => {
    const path = location.pathname;
    const homeClass = classNames('toolbarButton', { active: path === '/' || path === '/index.html' });
    const aboutClass = classNames('toolbarButton', { active: path === '/about.html' });

    return (
        <div id="navigation" className="group">
            <a href="/" aria-label="Home" title="Home" className={homeClass}>
                <svg className="buttonSvg" viewBox="0 0 194.9 179.1">
                    <path fill="currentColor"
                        d={'M39.8 10.3V31l17.9 10.3L75.6 31V10.3L57.7 0zm39.8 0V31l17.9 10.3L115.4 31V10.3L97.5 0zm39' +
                           '.7 0V31l17.9 10.3L155.1 31V10.3L137.2 0zM59.7 44.8v20.7l17.9 10.3 17.9-10.3V44.8L77.6 34.' +
                           '5zm39.8 0v20.7l17.9 10.3 17.9-10.3V44.8l-17.9-10.3zm39.7 0v20.7l17.9 10.3L175 65.5V44.8l-' +
                           '17.9-10.3zm-119.3 0v20.7l17.9 10.3 17.9-10.3V44.8L37.8 34.5zm59.7 34.4v20.7l17.9 10.3 17.' +
                           '9-10.3V79.2L97.5 68.9zm39.7 0v20.7l17.9 10.3 17.9-10.3V79.2l-17.9-10.3zm39.8 0v20.7l17.9 ' +
                           '10.3 17.9-10.3V79.2L177 68.9zm-119.3 0v20.7l17.9 10.3 17.9-10.3V79.2L57.7 68.9zM0 79.2v20' +
                           '.7l17.9 10.3 17.9-10.3V79.2L17.9 68.9zm59.7 34.5v20.7l17.9 10.3 17.9-10.3v-20.7l-17.9-10.' +
                           '3zm39.8 0v20.7l17.9 10.3 17.9-10.3v-20.7l-17.9-10.3zm39.7 0v20.7l17.9 10.3 17.9-10.3v-20.' +
                           '7l-17.9-10.3zm-119.3 0v20.7l17.9 10.3 17.9-10.3v-20.7l-17.9-10.3zm19.9 34.4v20.7l17.9 10.' +
                           '3 17.9-10.3v-20.7l-17.9-10.3zm39.8 0v20.7l17.9 10.3 17.9-10.3v-20.7l-17.9-10.3zm39.7 0v20' +
                           '.7l17.9 10.3 17.9-10.3v-20.7l-17.9-10.3'}/>
                </svg>
            </a>
            <a href="about.html" aria-label="About" title="About" className={aboutClass}>
                <svg className="buttonSvg" viewBox="0 0 16 16">
                    <path fill="currentColor" fillRule="evenodd"
                        d="M8 15A7 7 0 108 1a7 7 0 000 14zm0 1A8 8 0 108 0a8 8 0 000 16"/>
                    <path fill="currentColor"
                        d={'M5.25 5.79a.24.24 0 00.25.24h.82c.14 0 .25-.11.27-.25.09-.65.54-1.13 1.34-1.13.69 0 1.31.' +
                           '34 1.31 1.17 0 .63-.37.92-.96 1.37-.67.49-1.2 1.06-1.17 1.98v.22a.25.25 0 00.25.25h.81a.2' +
                           '5.25 0 00.25-.25v-.1c0-.72.28-.93 1.01-1.5.61-.46 1.25-.97 1.25-2.05C10.68 4.23 9.4 3.5 8' +
                           ' 3.5c-1.27 0-2.66.59-2.75 2.29zm1.56 5.76c0 .53.43.93 1.01.93.61 0 1.03-.4 1.03-.93 0-.55' +
                           '-.42-.94-1.03-.94-.58 0-1 .39-1 .94'}/>
                </svg>
            </a>
        </div>
    );
};

export const NavigationLinks = React.memo(NavigationLinksFunction);
