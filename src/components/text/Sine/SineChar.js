import styled, { keyframes } from "styled-components";

const anim = keyframes`
    from {
      top: -7px;
    }
    50% {
      top: 12px;
    }
    to {
      top: -7px;
    }
`;

const SinChar = styled.span`
  position: absolute;
  left: ${props => props.idx * 8}px;
  animation: ${anim} 1s ease-in-out infinite;
  animation-delay: ${props => props.idx * 0.1}s;
`;

export default SinChar;
