import React from 'react';

interface IImportExportPanelProps {
    isGeneratedLinkUpToDate: boolean,
    link: string,
    sourceCode: string,
    onGenerateLink: () => void,
    onGenerateAndCopyLink: () => void,
    onImportSourceCode: (newSource: string) => void,
    onLayoutCode: () => void,
    onMinifyCode: () => void,
}

export function ImportExportPanel(props: IImportExportPanelProps): JSX.Element {
    const { isGeneratedLinkUpToDate, link, sourceCode, onGenerateLink, onGenerateAndCopyLink,
        onImportSourceCode, onLayoutCode, onMinifyCode } = props;

    return (
        <div id="importExportPanel">
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
                spellCheck={false}
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
                className="inputBox"
                type="text"
                aria-label="Generated URL"
                placeholder="Generate a link that encodes to the current program and input."
                readOnly={true}
                value={link}/>
        </div>
    );
}
