import styled, { css } from "styled-components";
import { extraArea, s } from "@shared/styles";

type Props = {
  active?: boolean;
  disabled?: boolean;
  hovering?: boolean;
};

export default styled.button.attrs((props) => ({
  type: props.type || "button",
}))<Props>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex: 0;
  min-width: 28px;
  height: 28px;
  padding: 0 7px;
  cursor: var(--pointer);
  border: none;
  border-radius: 6px;
  background: none;
  outline: none;
  pointer-events: all;
  position: relative;
  opacity: 0.8;
  color: ${s("text")};
  transition:
    opacity 100ms ease-in-out,
    background 100ms ease-in-out;

  svg {
    flex-shrink: 0;
  }

  &:hover {
    opacity: 1;
    background: ${s("listItemHoverBackground")};
    z-index: 1;
  }

  ${(props) =>
    props.hovering &&
    css`
      opacity: 1;
    `};

  &:disabled {
    opacity: 0.3;
    cursor: default;
  }

  ${extraArea(5)}

  ${(props) =>
    props.active &&
    css`
      opacity: 1;
      color: ${s("accentText")};
      background: ${s("accent")};

      &:hover {
        background: ${s("accent")};
      }
    `};
`;
