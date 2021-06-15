import React from 'react';
import ReactDOM from 'react-dom';

import { DirectionalTypingIcon } from './EditControls';
import { PlayIcon, StepBackIcon } from './PlayControls';
import { EdgeTransitionModeIcon, ShowArrowsIcon, ShowInstructionPointersIcon } from './ViewControls';

export function updateAbout(element: HTMLElement): void {
    ReactDOM.render(
        <React.StrictMode><About/></React.StrictMode>,
        element);
}

const IconBorder: React.FC = ({ children }) =>
    <div className="toolbarButton aboutButton">
        {children}
    </div>;

export const About: React.FC = () =>
    <>
        <main className="about">
            <h1>About</h1>
            <h2>General</h2>
            <h4>What is Hexagony.net?</h4>
            <p>This is an online integrated development environment (IDE) for Hexagony, an esoteric programming language
                created by Martin Ender.
            </p>
            <p>See the <a href="//github.com/m-ender/hexagony">original Hexagony interpreter</a> for the language
                specification.
            </p>
            <h4>Is Hexagony.net open source?</h4>
            <p>Yes! It&apos;s licensed under <a href="//opensource.org/licenses/MIT">the MIT license</a> and available
                on <a href="//github.com/SirBogman/hexagony.net">GitHub</a>. Patches are welcome.
                Please <a href="//github.com/SirBogman/hexagony.net/issues/new">report any issues</a>.
            </p>
            <h4>Can I see an example program?</h4>
            <p>This is the default <a href="/#helloworld">hello world</a> program.</p>
            <p>
                This program outputs the infinite series of <a href="/#fibonacci">Fibonacci numbers</a>, separated by
                newlines.
                See the <a href="//codegolf.stackexchange.com/a/65017">original source of this Fibonacci program</a>.
            </p>
            <h2>Hexagony.net Features</h2>
            <h3>Directional Typing</h3>
            <p>
                <IconBorder>
                    <DirectionalTypingIcon/>
                </IconBorder>
                Directional typing helps you to write a Hexagony program by allowing you to type the instructions, in
                any of the six directions, in program execution order, without manually repositioning the cursor.
                There are two primary use cases for directional typing.
                When executing a program and typing from the active instruction pointer (IP) in its current direction,
                directional typing is said to be synchronized with execution.
            </p>
            <p>
                When directional typing is synchronized with execution:
                <ul>
                    <li>Typing a character will execute that instruction and advance the instruction pointer.</li>
                    <li>Undoing that change will step back the execution, as if you had pressed the step back button,
                        except the cursor also follows and the change is undone.</li>
                    <li>Redo does the reverse.</li>
                    <li>Branches will be taken based on the current memory value.</li>
                    <li>When moving backwards with directional typing (shift + space, or backspace), it works as if you
                        had pressed the step back button, except that the cursor follows as well.</li>
                    <li>An easy way to try this is to press the reset button to start with an empty program, press the
                        step forward button to begin execution, then click the active cell (or anywhere in the
                        background of the code panel) and type the first instruction.</li>
                </ul>
            </p>
            <p>
                When directional typing is not synchronized with execution:
                <ul>
                    <li>The cursor advances in the same way that the instruction pointer would during program
                        execution. It interacts with mirrors and wraps around edges.</li>
                    <li>Positive branches are always followed when stepping either forward or backwards.</li>
                    <li>Instructions that switch to different instruction pointers are ignored.</li>
                </ul>
            </p>

            <p>
                In all cases:
                <ul>
                    <li>You can access the direction picker by clicking on its toolbar icon, or set the typing direction
                        using the arrow keys on the keyboard.</li>
                    <li>Pressing the space key will move the cursor along the typing direction axis, without changing
                        the code.</li>
                    <li>Holding shift and pressing space will move the cursor backwards along the typing axis, without
                        changing the code.</li>
                    <li>Backspace moves backwards along the typing axis and replaces instructions with no-ops.</li>
                    <li>Clicking on the background of the code panel will focus either the last active cell or, if the
                        program is executing, the cell at the currently active instruction pointer. Using tab to focused
                        the code panel with the keyboard will do the same.
                    </li>
                </ul>
            </p>
            <h3>Step Back</h3>
            <p>
                <IconBorder>
                    <StepBackIcon/>
                </IconBorder>
                When running a program and execution is paused, you can step back up to 100 times in a row. Each step
                back reverts the effects of executing the last instruction. This feature is independent of undo/redo for
                modifying the program code, except when directional typing is synchronized with execution. Stepping back
                will never change the program code (but undo can trigger a step back). If the code has been modified
                since it has executed, stepping back will revert the effects of the instruction that was executed, not
                the instruction as it currently appears. However, stepping forward will execute the instruction that
                currently appears.
            </p>
            <h3>Edit and Continue</h3>
            <p>
                <IconBorder>
                    <PlayIcon/>
                </IconBorder>
                You can change the Hexagony program and the input, while the program is running.
                It doesn&apos;t affect previously executed instructions or previously consumed input.
                It&apos;s not necessary to pause execution when editing code, but it&apos;s generally a good idea.
            </p>
            <h3>Breakpoints</h3>
            <p>
                <IconBorder>
                    <svg className="buttonSvg" viewBox="0 0 42 50">
                        <path fill="none" stroke="currentColor" strokeWidth="3px"
                            d="M2 14.03v21.94l19 10.97 19-10.97V14.03L21 3.06 2 14.03z"/>
                    </svg>
                </IconBorder>
                You can set breakpoints using the Ctrl + B keyboard shortcut. Program execution will pause when you hit
                a breakpoint, giving you the opportunity to examine the program state just before the instruction
                executes. You could even change the code with edit and continue before proceeding.
            </p>
            <h3>Edge Transition Mode</h3>
            <p>
                <IconBorder>
                    <EdgeTransitionModeIcon/>
                </IconBorder>
                Edge transition mode helps you to line up instructions with edge transitions so that program execution
                can wrap around. You code is automatically replicated in all of the hexagons to help you align code with
                the edge transitions. Corners have special behavior in Hexagony.
                The <span className="monospace">+</span> transitions are followed,
                if the value at the current memory location is positive. If the value is zero or negative,
                the <span className="monospace">-</span> transitions are followed. Look for this icon on the toolbar.
            </p>
            <h3>Execution History</h3>
            <p>
                <IconBorder>
                    <ShowArrowsIcon/>
                </IconBorder>
                The execution history button shows the directions that the instruction pointer moved over each cell.
                Part of the fun of hexagony is using the same instruction in multiple code paths, which execute the
                instruction while moving in different directions. There are more opportunities to reuse code in this way
                with a hexagonal grid structure then there are with a rectangular one.
            </p>
            <h3>Show Instruction Pointers</h3>
            <p>
                <IconBorder>
                    <ShowInstructionPointersIcon/>
                </IconBorder>
                Hexagony has six instruction pointers and one of them is active at any given time. Use this button to
                see where all of the instruction pointers are at once. The
                instructions <span className="monospace">[]#</span> are used to access the other instruction pointers.
            </p>
            <h3>High Speed Mode</h3>
            <p>
                Increase the speed slider to the maximum value to execute the program as fast as possible, updating the
                UI every 100,000 execution steps. It will stop automatically when a breakpoint is
                hit, <span className="monospace">@</span> is executed, or division by zero occurs.
            </p>
            <h2>Hexagony Language</h2>
            <h4>What happens when characters not listed in the specification are used as instructions?</h4>
            <p>
                When codepoints are used other than defined instructions, the value at the memory pointer is set to the
                codepoint value. This is the same behavior as the instructions A-Z and a-z. All Unicode codepoints are
                allowed. The characters tab (9), line feed (10), vertical tab (11), form feed (12), carriage return
                (13), space (32), and <span className="monospace">`</span> (96) are ignored. Note that codepoints above
                65535 can currently only be entered using the import/export panel.
            </p>
            <h4>Where else can I use Hexagony?</h4>
            <p>You can compete in Hexagony on <a href="//code.golf/fibonacci#hexagony">Code Golf</a>.</p>
            <p>
                You can find many Hexagony programs, including explanations of how they work,
                on <a href="//codegolf.stackexchange.com">Code Golf &amp; Coding Challenges Stack Exchange</a>.
            </p>
            <h4>Is there a fast command-line interpreter for Hexagony?</h4>
            <p>
                This <a href="//github.com/SirBogman/Hexagony">C# interpreter</a> is faster than the reference
                implementation. Additionally, it&apos;s the Hexagony interpreter
                for <a href="//code.golf/fibonacci#hexagony">Code Golf</a>.
            </p>
        </main>
    </>;
