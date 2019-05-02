import React from "react";
import styled from "styled-components";

function FullWidth({ children, className }) {
  return <span className={className}>{children}</span>;
}

export default styled(FullWidth)`
  letter-spacing: 6px;
`;
