import React from "react";
import SinChar from "./SineChar";
import styled from "styled-components";

const Sine = ({ word, className }) => {
  const len = word.length;
  const ret = new Array(len);
  for (let i = 0; i < len; i++) {
    ret[i] = <SinChar key={i} idx={i}>{word[i]}</SinChar>;
  }
  return <span className={className}>{ret}</span>;
};

export default styled(Sine)`
  color: ${props => props.color};
  width: ${props => props.word.length * 8}px;
  position: relative;
  display: inline-block;
  height: 16px;
`;
