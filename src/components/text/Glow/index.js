import styled, { keyframes } from "styled-components";

const glowAnim = keyframes`
    from {
      text-shadow: 0 0 0 white;
      color: white;
    }
    50% {
      text-shadow: 0 0 6px purple;
      color: purple;
    }
    to {
      text-shadow: 0 0 0 white;
      color: white;
    }
`;

const Glow = styled.span`
  animation: ${glowAnim} 2s ease-in-out infinite;
`;

export default Glow;
