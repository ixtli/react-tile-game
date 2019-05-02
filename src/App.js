import React, { Component } from "react";
import Display from "./components/Display";
import { canRun, warn } from "./util/compatability";
import * as stats from "./util/stats-wrapper";
import styled from "styled-components";
import Sine from "./components/text/Sine";
import Glow from "./components/text/Glow";
import Color from "./components/text/Color";
import FullWidth from "./components/text/FullWidth";

function ErrorDisplay() {
  return (
    <div>
      <p>Couldn't initialize renderer. Check the console.</p>
    </div>
  );
}

const MessageContainer = styled.div`
  margin: 50px;
  color: white;
  padding: 20px;
  background-color: black;
  font-family: "unscii-16-full", monospace;
`;

class App extends Component {
  static RUN = canRun();

  componentDidMount() {
    if (!App.RUN) {
      return;
    }

    stats.show();
    warn();
  }

  render() {
    return (
      <div className="App">
        {App.RUN ? <Display /> : <ErrorDisplay />}
        <MessageContainer>
          <p>
            Hello, <Glow>world</Glow>. Something{" "}
            <Sine word={"different"} color={"yellow"} /> too.{" "}
            <FullWidth>
              これも
              <Color color={"red"}>出来る</Color>よ！
            </FullWidth>
          </p>
        </MessageContainer>
      </div>
    );
  }
}

export default App;
