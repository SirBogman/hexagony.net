import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';

const outputRef = React.createRef();

export function updateOutputPanel(element, outputBytes) {
    ReactDOM.render(<React.StrictMode><OutputPanel outputBytes={outputBytes} ref={outputRef}/></React.StrictMode>, element);
}

export function hackSetOutputPanelHeight(height) {
    const component = outputRef.current;
    if (component) {
        const outputBox = component.outputBoxRef.current;
        if (outputBox) {
            outputBox.parentNode.style.height = height;
        }
        else {
            console.log('WARNING NO OUTPUT BOX');
        }
    }
    else {
        console.log('WARNING NO OUTPUT COMPONENT');
    }
}

class OutputPanel extends React.Component {
    constructor(props) {
        super(props);
        let utf8Output;
        try {
             utf8Output = JSON.parse(localStorage.utf8Output);
        }
        // eslint-disable-next-line no-empty
        catch {
        }

        if (utf8Output !== true && utf8Output !== false) {
            utf8Output = true;
        }

        this.state = { utf8Output };
        this.outputBoxRef = React.createRef();
    }

    shouldComponentUpdate(nextProps, nextState) {
        return nextProps.outputBytes.length !== this.lastOutputLength ||
            nextState.utf8Output !== this.state.utf8Output;
    }

    onUtf8OutputChanged(value) {
        this.setState({utf8Output: value});
        localStorage.utf8Output = JSON.stringify(value);
    }

    render() {
        const { outputBytes } = this.props;
        const { utf8Output } = this.state;
        this.lastOutputLength = outputBytes.length;
        let output;
        if (utf8Output) {
            output = new TextDecoder().decode(new Uint8Array(outputBytes));
        }
        else {
            output = String.fromCharCode(...outputBytes);
        }

        return (
            <>
                <h1>Output</h1>
                <div className="radio">
                    <label title="UTF-8 output mode: the output byte stream is interepreted as UTF-8. This is compatible with Code Golf.">
                        <input
                            type="radio"
                            name="outputMode"
                            value="utf8"
                            checked={utf8Output}
                            onChange={() => this.onUtf8OutputChanged(true)}/>
                        UTF-8
                    </label>
                    <label title="Raw output mode: the output byte stream is displayed directly.">
                        <input
                            type="radio"
                            name="outputMode"
                            value="raw"
                            checked={!utf8Output}
                            onChange={() => this.onUtf8OutputChanged(false)}/>
                        Raw
                    </label>
                </div>
                <div id="outputContainer">
                    <div id="outputBox" className="pre" ref={this.outputBoxRef}>{output}</div>
                </div>
            </>
        );
    }

    componentDidUpdate() {
        const outputBox = this.outputBoxRef.current;
        outputBox.scrollTop = outputBox.scrollHeight;
    }
}

OutputPanel.propTypes = {
    outputBytes: PropTypes.arrayOf(PropTypes.number).isRequired,
};
