import React from "react";

import {attach, destroy} from "../../gl/main";

export default class Display extends React.Component {
  constructor(props) {
    super(props);
    this.ref = React.createRef();
  }

  componentDidMount() {
    attach(this.ref.current);
  }

  componentWillUnmount() {
    console.warn("Unmounting <Display />! This may indicate a problem.");
    destroy();
  }

  render() {
    return <canvas id={"game"} ref={this.ref} />;
  }
}
