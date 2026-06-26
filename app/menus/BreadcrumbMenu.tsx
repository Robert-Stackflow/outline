import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { MoreIcon } from "outline-icons";
import { observer } from "mobx-react";
import * as React from "react";
import { useHistory } from "react-router-dom";
import styled from "styled-components";
import { depths, s } from "@shared/styles";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import useActionContext from "~/hooks/useActionContext";
import { actionToMenuItem } from "~/actions";
import type { InternalLinkAction, MenuInternalLink } from "~/types";

const HOVER_OPEN_DELAY = 120;
const HOVER_CLOSE_DELAY = 200;

type Props = {
  actions: InternalLinkAction[];
};

/**
 * "..." button shown inside the breadcrumb when the path is too long. Opens a
 * file-manager-style dropdown on hover that mirrors the chevron menu next to
 * it for a consistent visual language.
 */
function BreadcrumbMenu_({ actions }: Props) {
  const actionContext = useActionContext({ isMenu: true });
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

  const items = actions.map((action) => {
    const item = actionToMenuItem(action, actionContext) as MenuInternalLink;
    return { action, item };
  });

  if (items.length === 0) {
    return null;
  }

  return (
    <DropdownMenuPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          cancelTimers();
          setOpen(false);
        }
      }}
      modal={false}
    >
      <DropdownMenuPrimitive.Trigger asChild>
        <Trigger
          type="button"
          aria-label="Show path"
          onMouseEnter={scheduleOpen}
          onMouseLeave={scheduleClose}
        >
          <Ellipsis aria-hidden />
        </Trigger>
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
            {items.map(({ item }, index) => (
              <Item key={index} item={item} />
            ))}
          </MenuPanel>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}

const Item = ({ item }: { item: MenuInternalLink }) => {
  const history = useHistory();
  const sidebarContext = useLocationSidebarContext();

  const navigate = React.useCallback(() => {
    const to = item.to;
    if (typeof to === "string") {
      history.push({ pathname: to, state: { sidebarContext } });
    } else if (to) {
      history.push({ ...to, state: { sidebarContext, ...(to.state ?? {}) } });
    }
  }, [history, item.to, sidebarContext]);

  return (
    <DropdownMenuPrimitive.Item asChild onSelect={navigate}>
      <Row>
        {item.icon}
        <RowTitle>{item.title}</RowTitle>
      </Row>
    </DropdownMenuPrimitive.Item>
  );
};

const Ellipsis = styled(MoreIcon)`
  width: 20px;
  height: 20px;
  color: ${s("textTertiary")};
  opacity: 0.7;
  transition: opacity 160ms ease, color 160ms ease;
`;

const Trigger = styled.button`
  appearance: none;
  background: transparent;
  border: none;
  width: 28px;
  height: 28px;
  margin-inline: 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: var(--pointer);
  color: inherit;
  border-radius: 6px;
  transition: background 120ms ease;

  &:hover,
  &[data-state="open"] {
    background: ${s("listItemHoverBackground")};

    ${Ellipsis} {
      opacity: 1;
      color: ${s("textSecondary")};
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

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: var(--pointer);
  color: ${s("textSecondary")};
  user-select: none;

  &:hover,
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

export default observer(BreadcrumbMenu_);
