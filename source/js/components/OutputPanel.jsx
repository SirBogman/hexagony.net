import React from 'react';
import PropTypes from 'prop-types';

export class OutputPanel extends React.Component {
    constructor(props) {
        super(props);
        this.outputBoxRef = React.createRef();
    }

    shouldComponentUpdate(nextProps) {
        return nextProps.outputBytes.length !== this.lastOutputLength ||
            nextProps.utf8Output !== this.props.utf8Output;
    }

    render() {
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

    componentDidUpdate() {
        const outputBox = this.outputBoxRef.current;
        outputBox.scrollTop = outputBox.scrollHeight;
    }
}

OutputPanel.propTypes = {
    outputBytes: PropTypes.arrayOf(PropTypes.number).isRequired,
    utf8Output: PropTypes.bool.isRequired,
    onUtf8OutputChanged: PropTypes.func.isRequired,
};
