import { GoToIcon } from "outline-icons";
import { observer } from "mobx-react";
import * as React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { s, ellipsis } from "@shared/styles";
import { NavigationNode } from "@shared/types";
import BreadcrumbChevronMenu from "~/components/BreadcrumbChevronMenu";
import Flex from "~/components/Flex";
import BreadcrumbMenu from "~/menus/BreadcrumbMenu";
import { undraggableOnDesktop } from "~/styles";
import type { InternalLinkAction, MenuInternalLink } from "~/types";
import { actionToMenuItem } from "~/actions";
import useActionContext from "~/hooks/useActionContext";
import { useComputed } from "~/hooks/useComputed";

type TopLevelAction =
  | InternalLinkAction
  | { type: "menu"; actions: InternalLinkAction[] };

type Props = React.PropsWithChildren<{
  actions: InternalLinkAction[];
  max?: number;
  highlightFirstItem?: boolean;
  /**
   * Optional resolver for sibling documents per chevron gap. The returned
   * nodes (and their children) drive a hover-expand file-manager-style
   * dropdown on each chevron. Return `undefined` to keep the chevron as a
   * plain non-interactive separator for that gap.
   *
   * @param gapIndex - zero-based gap index between rendered crumbs.
   * @returns the sibling navigation nodes to expose, or undefined.
   */
  getChevronSiblings?: (gapIndex: number) => NavigationNode[] | undefined;
}>;

function Breadcrumb(
  {
    actions,
    highlightFirstItem,
    children,
    max = 2,
    getChevronSiblings,
  }: Props,
  ref: React.RefObject<HTMLDivElement> | null
) {
  const actionContext = useActionContext({ isMenu: true });

  const visibleActions = useComputed(
    () =>
      actions.filter((action) =>
        typeof action.visible === "function"
          ? action.visible(actionContext)
          : (action.visible ?? true)
      ),
    [actions, actionContext]
  );
  const totalVisibleActions = visibleActions.length;

  const topLevelActions: TopLevelAction[] = [...visibleActions];

  // chop middle breadcrumbs and present a "..." menu instead
  if (totalVisibleActions > max) {
    const halfMax = Math.floor(max / 2);
    const menuActions = topLevelActions.splice(
      halfMax,
      totalVisibleActions - max
    ) as InternalLinkAction[];

    topLevelActions.splice(halfMax, 0, {
      type: "menu",
      actions: menuActions,
    });
  }

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (event.currentTarget.querySelector('[data-state="open"]')) {
        event.preventDefault();
      }
    },
    []
  );

  const toBreadcrumb = React.useCallback(
    (action: TopLevelAction, index: number) => {
      if (action.type === "menu") {
        return <BreadcrumbMenu key="menu" actions={action.actions} />;
      }

      const item = actionToMenuItem(action, actionContext) as MenuInternalLink;

      return (
        <Item
          to={item.to}
          onClick={handleClick}
          $highlight={!!highlightFirstItem && index === 0}
        >
          {item.icon}
          <Title>{item.title}</Title>
        </Item>
      );
    },
    [actionContext, handleClick, highlightFirstItem]
  );

  // When the middle of the path is collapsed into a "..." menu, the gap index
  // no longer maps to the original action ladder — so we only enable the
  // hover-expand chevron menus when nothing is truncated.
  const chevronsEnabled = !!getChevronSiblings && topLevelActions.length === totalVisibleActions;

  return (
    <Flex justify="flex-start" align="center" ref={ref}>
      {topLevelActions.map((action, index) => {
        const isLastGap = index === topLevelActions.length - 1;
        const hasTrailingGap = isLastGap ? !!children : true;
        const siblings = chevronsEnabled
          ? getChevronSiblings?.(index)
          : undefined;
        const activeId =
          action.type === "menu"
            ? undefined
            : extractActiveId(action, actionContext);

        return (
          <React.Fragment
            key={action.type === "menu" ? "menu" : `item-${index}`}
          >
            {toBreadcrumb(action, index)}
            {hasTrailingGap ? (
              siblings && siblings.length > 0 ? (
                <BreadcrumbChevronMenu
                  siblings={siblings}
                  activeId={activeId}
                />
              ) : (
                <Slash />
              )
            ) : null}
          </React.Fragment>
        );
      })}
      {children}
    </Flex>
  );
}

/** Pulls the link target id from an internal link action, if resolvable. */
function extractActiveId(
  action: InternalLinkAction,
  context: ReturnType<typeof useActionContext>
) {
  const item = actionToMenuItem(action, context) as MenuInternalLink;
  if (typeof item.to === "string") {
    return item.to.split("/").pop();
  }
  if (item.to && typeof item.to === "object" && "pathname" in item.to) {
    return item.to.pathname?.split("/").pop();
  }
  return undefined;
}

const Slash = styled(GoToIcon)`
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  margin-inline: 2px;
  color: ${s("textTertiary")};
  opacity: 0.55;
`;

const Item = styled(Link)<{ $highlight: boolean }>`
  ${undraggableOnDesktop()}

  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 1;
  min-width: 0;
  cursor: var(--pointer);
  color: ${s("textSecondary")};
  font-size: 14px;
  height: 30px;
  font-weight: ${(props) => (props.$highlight ? 500 : 400)};
  padding-inline: 6px;
  border-radius: 6px;
  text-decoration: none;
  max-width: 360px;
  transition:
    background 120ms ease,
    color 120ms ease;

  &:has([data-state="open"]),
  &:hover {
    background: ${s("listItemHoverBackground")};
    color: ${s("text")};
  }

  svg {
    flex-shrink: 0;
  }
`;

const Title = styled.span`
  ${ellipsis()}
  min-width: 0;
`;

export default observer(React.forwardRef<HTMLDivElement, Props>(Breadcrumb));
