import { CollapsedIcon } from "outline-icons";
import * as React from "react";
import styled, { keyframes } from "styled-components";
import { extraArea, s } from "@shared/styles";
import usePersistedState from "~/hooks/usePersistedState";
import { undraggableOnDesktop } from "~/styles";

type Props = {
  /** Unique header id – if passed the header will become toggleable */
  id?: string;
  title: React.ReactNode;
  /**
   * Optional inline action controls (e.g. "+ new") rendered on the right of
   * the section header. They are revealed on hover/focus.
   */
  actions?: React.ReactNode;
  children?: React.ReactNode;
};

export function getHeaderExpandedKey(id: string) {
  return `sidebar-header-${id}`;
}

/**
 * Toggleable sidebar header
 */
export const Header: React.FC<Props> = ({
  id,
  title,
  actions,
  children,
}: Props) => {
  const [firstRender, setFirstRender] = React.useState(true);
  const [expanded, setExpanded] = usePersistedState<boolean>(
    getHeaderExpandedKey(id ?? ""),
    true,
  );

  React.useEffect(() => {
    if (!expanded) {
      setFirstRender(false);
    }
  }, [expanded]);

  const handleClick = React.useCallback(() => {
    setExpanded(!expanded);
  }, [expanded, setExpanded]);

  return (
    <>
      <H3>
        <Button onClick={handleClick} disabled={!id}>
          {title}
          {id && <Disclosure $expanded={expanded} size={16} />}
        </Button>
        {actions && <Actions>{actions}</Actions>}
      </H3>
      {expanded && (firstRender ? children : <Fade>{children}</Fade>)}
    </>
  );
};

export const fadeAndSlideDown = keyframes`
  from {
    opacity: 0;
    transform: translateY(-8px);
  }

  to {
    opacity: 1;
    transform: translateY(0px);
  }
`;

const Fade = styled.span`
  animation: ${fadeAndSlideDown} 100ms ease-in-out;
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 500;
  user-select: none;
  color: ${s("sidebarText")};
  position: relative;
  letter-spacing: 0.02em;
  margin: 0;
  padding: 6px 4px 6px 16px;
  border: 0;
  background: none;
  -webkit-appearance: none;
  transition: color 120ms ease;
  ${undraggableOnDesktop()}
  ${extraArea(4)}

  &:not(:disabled):hover,
  &:not(:disabled):active {
    color: ${s("sidebarText")};
    cursor: var(--pointer);
  }
`;

const Disclosure = styled(CollapsedIcon)<{ $expanded?: boolean }>`
  transition:
    opacity 120ms ease,
    transform 180ms ease;
  ${(props) => !props.$expanded && "transform: rotate(-90deg);"};
  opacity: 0;
  margin-inline-start: 2px;

  [dir="rtl"] & {
    ${(props) => !props.$expanded && "transform: rotate(90deg);"};
  }
`;

const Actions = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-inline-start: auto;
  padding-inline-end: 4px;
  opacity: 0;
  transition: opacity 120ms ease;
`;

const H3 = styled.h3`
  margin: 0 0 2px;
  display: flex;
  align-items: center;
  min-height: 30px;
  border-radius: 4px;
  cursor: var(--pointer);
  transition: background 120ms ease;

  &:hover,
  &:focus-within {
    background: ${s("sidebarHoverBackground")};

    ${Disclosure},
    ${Actions} {
      opacity: 1;
    }
  }
`;

export default Header;
