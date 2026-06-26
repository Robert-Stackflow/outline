import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { GoToIcon } from "outline-icons";
import { observer } from "mobx-react";
import * as React from "react";
import { useHistory } from "react-router-dom";
import styled from "styled-components";
import { depths, s } from "@shared/styles";
import { NavigationNode } from "@shared/types";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";

const HOVER_OPEN_DELAY = 120;
const HOVER_CLOSE_DELAY = 200;

type HoverHandlers = {
  cancel: () => void;
  scheduleClose: () => void;
};

const HoverContext = React.createContext<HoverHandlers | null>(null);

type Props = {
  /** Sibling nodes shown when the chevron is hovered. */
  siblings: NavigationNode[];
  /** Id of the breadcrumb item to highlight inside the menu. */
  activeId?: string;
};

/**
 * Renders a breadcrumb chevron that, on hover, drops down a file-manager-style
 * list of sibling documents. Each entry with children expands into a nested
 * submenu so the user can drill the document tree without leaving the bar.
 */
function BreadcrumbChevronMenu_({ siblings, activeId }: Props) {
  const [open, setOpen] = React.useState(false);
  const openTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelTimers = React.useCallback(() => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleOpen = React.useCallback(() => {
    cancelTimers();
    openTimer.current = setTimeout(() => setOpen(true), HOVER_OPEN_DELAY);
  }, [cancelTimers]);

  const scheduleClose = React.useCallback(() => {
    cancelTimers();
    closeTimer.current = setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY);
  }, [cancelTimers]);

  React.useEffect(() => cancelTimers, [cancelTimers]);

  const hoverHandlers = React.useMemo<HoverHandlers>(
    () => ({ cancel: cancelTimers, scheduleClose }),
    [cancelTimers, scheduleClose]
  );

  if (siblings.length === 0) {
    return <Chevron aria-hidden />;
  }

  return (
    <HoverContext.Provider value={hoverHandlers}>
      <DropdownMenuPrimitive.Root
        open={open}
        onOpenChange={(next) => {
          // Hover state owns open transitions; only honor Radix's explicit
          // close requests (outside click, escape) so focus-into-content does
          // not race with our timers and cause flicker.
          if (!next) {
            cancelTimers();
            setOpen(false);
          }
        }}
        modal={false}
      >
        <DropdownMenuPrimitive.Trigger asChild>
          <ChevronTrigger
            type="button"
            aria-label="Show sibling documents"
            onMouseEnter={scheduleOpen}
            onMouseLeave={scheduleClose}
          >
            <Chevron aria-hidden />
          </ChevronTrigger>
        </DropdownMenuPrimitive.Trigger>
        <DropdownMenuPrimitive.Portal>
          <DropdownMenuPrimitive.Content
            align="start"
            sideOffset={4}
            collisionPadding={6}
            onCloseAutoFocus={(event) => event.preventDefault()}
            asChild
          >
            <MenuPanel
              onMouseEnter={cancelTimers}
              onMouseLeave={scheduleClose}
            >
              {siblings.map((node) => (
                <NodeItem
                  key={node.id}
                  node={node}
                  active={node.id === activeId}
                />
              ))}
            </MenuPanel>
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Portal>
      </DropdownMenuPrimitive.Root>
    </HoverContext.Provider>
  );
}

type NodeItemProps = {
  node: NavigationNode;
  active: boolean;
};

const NodeItem = observer(function NodeItem_({ node, active }: NodeItemProps) {
  const history = useHistory();
  const sidebarContext = useLocationSidebarContext();
  const hover = React.useContext(HoverContext);

  const navigate = React.useCallback(() => {
    history.push({
      pathname: node.url,
      state: { sidebarContext },
    });
  }, [history, node.url, sidebarContext]);

  if (!node.children?.length) {
    return (
      <DropdownMenuPrimitive.Item asChild onSelect={navigate}>
        <Row $active={active}>
          <RowTitle>{node.title || "Untitled"}</RowTitle>
        </Row>
      </DropdownMenuPrimitive.Item>
    );
  }

  return (
    <DropdownMenuPrimitive.Sub>
      <DropdownMenuPrimitive.SubTrigger asChild>
        <Row
          $active={active}
          onClick={(event) => {
            event.preventDefault();
            navigate();
          }}
        >
          <RowTitle>{node.title || "Untitled"}</RowTitle>
          <RowDisclosure aria-hidden />
        </Row>
      </DropdownMenuPrimitive.SubTrigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.SubContent
          sideOffset={4}
          collisionPadding={6}
          asChild
        >
          <MenuPanel
            onMouseEnter={hover?.cancel}
            onMouseLeave={hover?.scheduleClose}
          >
            {node.children.map((child) => (
              <NodeItem key={child.id} node={child} active={false} />
            ))}
          </MenuPanel>
        </DropdownMenuPrimitive.SubContent>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Sub>
  );
});

const Chevron = styled(GoToIcon)`
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  color: ${s("textTertiary")};
  opacity: 0.55;
  transform-origin: center;
  transition:
    opacity 160ms ease,
    color 160ms ease,
    transform 220ms cubic-bezier(0.32, 0.72, 0, 1);
`;

const ChevronTrigger = styled.button`
  appearance: none;
  background: transparent;
  border: none;
  padding: 4px 2px;
  margin-inline: 2px;
  display: inline-flex;
  align-items: center;
  cursor: var(--pointer);
  color: inherit;
  border-radius: 4px;
  transition: background 120ms ease;

  &:hover,
  &[data-state="open"] {
    background: ${s("listItemHoverBackground")};

    ${Chevron} {
      opacity: 1;
      color: ${s("textSecondary")};
      transform: rotate(90deg);
    }
  }
`;

const MenuPanel = styled.div`
  z-index: ${depths.menu};
  min-width: 220px;
  max-width: 320px;
  max-height: min(60vh, 480px);
  overflow-y: auto;
  padding: 6px;
  border-radius: 8px;
  background: ${s("menuBackground")};
  box-shadow: ${s("menuShadow")};
  outline: none;
  font-size: 14px;
`;

const Row = styled.div<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: var(--pointer);
  color: ${(props) => (props.$active ? props.theme.text : props.theme.textSecondary)};
  font-weight: ${(props) => (props.$active ? 500 : 400)};
  user-select: none;

  &:hover,
  &[data-state="open"],
  &[data-highlighted] {
    background: ${s("listItemHoverBackground")};
    color: ${s("text")};
    outline: none;
  }
`;

const RowTitle = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RowDisclosure = styled(GoToIcon)`
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  color: ${s("textTertiary")};
`;

export default observer(BreadcrumbChevronMenu_);
