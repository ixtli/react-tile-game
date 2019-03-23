import React, { Component } from "react";
import Display from "./components/Display";
import { canRun, warn } from "./util/compatability";
import * as stats from "./util/stats-wrapper";

function ErrorDisplay() {
  return (
    <div>
      <p>Couldn't initialize renderer. Check the console.</p>
    </div>
  );
}

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
      <div className="App">{App.RUN ? <Display /> : <ErrorDisplay />}</div>
    );
  }
}

export default App;
