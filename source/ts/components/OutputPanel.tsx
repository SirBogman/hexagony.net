import { List } from 'immutable';
import React from 'react';
import { assertNotNull } from '../view/ViewUtil';

interface IOutputPanelProps {
    outputBytes: List<number>;
    utf8Output: boolean;
    onUtf8OutputChanged: (value: boolean) => void;
}

export class OutputPanel extends React.Component<IOutputPanelProps> {
    private outputBoxRef: React.RefObject<HTMLDivElement> = React.createRef();

    override shouldComponentUpdate(nextProps: IOutputPanelProps): boolean {
        return nextProps.outputBytes !== this.props.outputBytes ||
            nextProps.utf8Output !== this.props.utf8Output;
    }

    override render(): JSX.Element {
        const { outputBytes, utf8Output, onUtf8OutputChanged } = this.props;
        let output;
        if (utf8Output) {
            output = new TextDecoder().decode(new Uint8Array(outputBytes));
        }
        else {
            output = String.fromCharCode(...outputBytes);
        }

        return (
            <div id="outputPanel" className="appPanel">
                <h1>Output</h1>
                <div className="radio">
                    <label title={'UTF-8 output mode: the output byte stream is interepreted as UTF-8. This is ' +
                        'compatible with Code Golf.'}>
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

    override componentDidMount(): void {
        this.scrollToEnd();
    }

    override componentDidUpdate(): void {
        this.scrollToEnd();
    }

    scrollToEnd(): void {
        const outputBox = assertNotNull(this.outputBoxRef.current, 'outputBoxRef');
        outputBox.scrollTop = outputBox.scrollHeight;
    }
}
