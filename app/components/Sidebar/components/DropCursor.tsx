import * as React from "react";
import styled from "styled-components";

type Props = {
  isActiveDrop: boolean;
  innerRef: React.Ref<HTMLDivElement>;
  position?: "top";
};

function DropCursor({ isActiveDrop, innerRef, position }: Props) {
  return <Cursor isOver={isActiveDrop} ref={innerRef} position={position} />;
}

// transparent hover zone with a thin visible band vertically centered
const Cursor = styled.div<{
  isOver?: boolean;
  position?: "top";
}>`
  opacity: ${(props) => (props.isOver ? 1 : 0)};
  transition: opacity 150ms ease;
  position: absolute;
  z-index: 1;

  width: 100%;
  height: 14px;
  background: transparent;
  ${(props) => (props.position === "top" ? "top: -7px;" : "bottom: -7px;")}

  /* Notion-style drop indicator: an accent line with a leading dot, both
     vertically centered on the same axis (line center = 7px). */
  ::after {
    background: ${(props) => props.theme.accent};
    position: absolute;
    top: 6px;
    content: "";
    height: 2px;
    border-radius: 2px;
    width: 100%;
  }

  ::before {
    content: "";
    box-sizing: border-box;
    position: absolute;
    top: 3px;
    inset-inline-start: 0;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${(props) => props.theme.background};
    border: 2px solid ${(props) => props.theme.accent};
    z-index: 1;
  }
`;

export default DropCursor;
