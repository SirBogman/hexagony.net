import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';

export function updateImportExportPanelHelper(element, props) {
    ReactDOM.render(
        <React.StrictMode><ImportExportPanel {...props}/></React.StrictMode>,
        element);
}

function ImportExportPanel(props) {
    const { isGeneratedLinkUpToDate, link, sourceCode, onGenerateLink, onGenerateAndCopyLink,
        onImportSourceCode, onLayoutCode, onMinifyCode } = props;

    return (
        <>
            <h1>Import/Export</h1>
            <div>
                <button className="editButton bodyButton"
                    onClick={onMinifyCode}
                    title="Remove unnecessary whitespace and trailing no-ops from the Hexagony program.">
                    Minify Source
                </button>
                <button className="editButton bodyButton"
                    onClick={onLayoutCode}
                    title="Format the Hexagony program as hexagon using whitespace. Intended for export.">
                    Layout Source
                </button>
            </div>
            <textarea
                aria-label="Source Code Import/Export"
                spellCheck="False"
                autoCapitalize="off"
                autoComplete="off"
                value={sourceCode}
                onChange={e => onImportSourceCode(e.target.value)}/>
            <h2>Generate Link</h2>
            <div>
                <button className="editButton bodyButton"
                    disabled={isGeneratedLinkUpToDate}
                    onClick={onGenerateLink}
                    title="Create a link to the current Hexagony program and its input">
                    Generate
                </button>
                <button className="editButton bodyButton"
                    onClick={onGenerateAndCopyLink}
                    title="Copy a link to the current Hexagony program and its input to the clipboard">
                    Generate and Copy
                </button>
            </div>
            <input
                type="text"
                aria-label="Generated URL"
                placeholder="Generate a link that encodes to the current program and input."
                readOnly={true}
                value={link}/>
        </>
    );
}

ImportExportPanel.propTypes = {
    isGeneratedLinkUpToDate: PropTypes.bool.isRequired,
    link: PropTypes.string,
    sourceCode: PropTypes.string.isRequired,
    onGenerateLink: PropTypes.func.isRequired,
    onGenerateAndCopyLink: PropTypes.func.isRequired,
    onImportSourceCode: PropTypes.func.isRequired,
    onLayoutCode: PropTypes.func.isRequired,
    onMinifyCode: PropTypes.func.isRequired,
};
