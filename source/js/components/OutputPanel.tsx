import React from 'react';
import { assertNotNull } from '../view/ViewUtil';

interface IOutputPanelProps {
    outputBytes: number[];
    utf8Output: boolean;
    onUtf8OutputChanged: (value: boolean) => void;
}

export class OutputPanel extends React.Component<IOutputPanelProps> {
    outputBoxRef: React.RefObject<HTMLDivElement>;
    lastOutputLength: number;

    constructor(props: IOutputPanelProps) {
        super(props);
        this.lastOutputLength = 0;
        this.outputBoxRef = React.createRef();
    }

    shouldComponentUpdate(nextProps: IOutputPanelProps): boolean {
        return nextProps.outputBytes.length !== this.lastOutputLength ||
            nextProps.utf8Output !== this.props.utf8Output;
    }

    render(): JSX.Element {
        const { outputBytes, utf8Output, onUtf8OutputChanged } = this.props;
        this.lastOutputLength = outputBytes.length;
        let output;
        if (utf8Output) {
            output = new TextDecoder().decode(new Uint8Array(outputBytes));
        }
        else {
            output = String.fromCharCode(...outputBytes);
        }

        return (
            <div id="outputPanel">
                <h1>Output</h1>
                <div className="radio">
                    <label title="UTF-8 output mode: the output byte stream is interepreted as UTF-8. This is compatible with Code Golf.">
                        <input
                            type="radio"
                            name="outputMode"
                            value="utf8"
                            checked={utf8Output}
                            onChange={() => onUtf8OutputChanged(true)}/>
                        UTF-8
                    </label>
                    <label title="Raw output mode: the output byte stream is displayed directly.">
                        <input
                            type="radio"
                            name="outputMode"
                            value="raw"
                            checked={!utf8Output}
                            onChange={() => onUtf8OutputChanged(false)}/>
                        Raw
                    </label>
                </div>
                <div id="outputContainer">
                    <div id="outputBox" className="pre" ref={this.outputBoxRef}>{output}</div>
                </div>
            </div>
        );
    }

    componentDidMount(): void {
        this.scrollToEnd();
    }

    componentDidUpdate(): void {
        this.scrollToEnd();
    }

    scrollToEnd(): void {
        const outputBox = assertNotNull(this.outputBoxRef.current, 'outputBoxRef');
        outputBox.scrollTop = outputBox.scrollHeight;
    }
}
