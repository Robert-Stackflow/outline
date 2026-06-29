import { NodeSelection } from "prosemirror-state";
import { selectedRect } from "prosemirror-tables";
import * as React from "react";
import { Portal as ReactPortal } from "react-portal";
import styled, { css, keyframes } from "styled-components";
import { isCode } from "@shared/editor/lib/isCode";
import { findParentNode } from "@shared/editor/queries/findParentNode";
import { EditorStyleHelper } from "@shared/editor/styles/EditorStyleHelper";
import { depths, s } from "@shared/styles";
import { HEADER_HEIGHT } from "~/components/Header";
import { Portal } from "~/components/Portal";
import useEventListener from "~/hooks/useEventListener";
import useKeyboardStickyOffset from "~/hooks/useKeyboardStickyOffset";
import useMobile from "~/hooks/useMobile";
import Logger from "~/utils/Logger";
import { useEditor } from "./EditorContext";
import {
  getFloatingToolbarHorizontalPosition,
  getTopSelectionLineBounds,
} from "./floatingToolbarPosition";
import { ColumnSelection } from "@shared/editor/selection/ColumnSelection";
import { RowSelection } from "@shared/editor/selection/RowSelection";
import { isTableSelected } from "@shared/editor/queries/table";

type Props = {
  align?: "start" | "end" | "center";
  active?: boolean;
  children: React.ReactNode;
  from?: number;
  to?: number;
  width?: number;
  forwardedRef?: React.RefObject<HTMLDivElement> | null;
};

const defaultPosition = {
  left: -10000,
  top: 0,
  offset: 0,
  maxWidth: 1000,
  blockSelection: false,
  visible: false,
};

function getBrowserSelectionBounds(editorRoot: HTMLElement) {
  const selection = editorRoot.ownerDocument.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return undefined;
  }

  const range = selection.getRangeAt(0);
  const commonAncestor = range.commonAncestorContainer;
  const selectionRoot =
    commonAncestor instanceof Element
      ? commonAncestor
      : commonAncestor.parentElement;

  if (!selectionRoot || !editorRoot.contains(selectionRoot)) {
    return undefined;
  }

  return getTopSelectionLineBounds(Array.from(range.getClientRects()));
}

function usePosition({
  menuRef,
  contentRef,
  active,
  align = "center",
  from,
  to,
}: {
  menuRef: React.RefObject<HTMLDivElement>;
  contentRef: React.RefObject<HTMLDivElement>;
  active?: boolean;
  align?: Props["align"];
  from?: number;
  to?: number;
}) {
  const { view } = useEditor();
  const { selection } = view.state;
  const [menuSize, setMenuSize] = React.useState({
    width: 0,
    height: 36,
  });
  const menuWidth = menuSize.width;
  const menuHeight = menuSize.height;
  const menuGap = 10;

  const measureMenu = React.useCallback(() => {
    const element = contentRef.current ?? menuRef.current;
    if (!element) {
      return;
    }

    const bounds = element.getBoundingClientRect();
    const width = element.offsetWidth || Math.round(bounds.width);
    const height = Math.max(
      36,
      element.offsetHeight || Math.round(bounds.height),
    );

    setMenuSize((current) =>
      current.width === width && current.height === height
        ? current
        : { width, height },
    );
  }, [contentRef, menuRef]);

  // Measure the visible menu content after DOM updates. The link editor is
  // taller than the compact formatting toolbar, so positioning from a fixed
  // height would place the expanded control over the selected link.
  React.useLayoutEffect(() => {
    measureMenu();
  });

  React.useLayoutEffect(() => {
    const element = contentRef.current ?? menuRef.current;
    if (!element || typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const observer = new ResizeObserver(measureMenu);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [contentRef, measureMenu, menuRef]);

  // based on the start and end of the selection calculate the position at
  // the center top
  let fromPos;
  let toPos;
  try {
    fromPos = view.coordsAtPos(from ?? selection.from);
    toPos = view.coordsAtPos(to ?? selection.to, -1);
  } catch (err) {
    Logger.warn("Unable to calculate selection position", { err });
    return defaultPosition;
  }

  // ensure that start < end for the menu to be positioned correctly
  const selectionBounds = {
    top: Math.min(fromPos.top, toPos.top),
    bottom: Math.max(fromPos.bottom, toPos.bottom),
    left: Math.min(fromPos.left, toPos.left),
    right: Math.max(fromPos.right, toPos.right),
  };

  const browserSelectionBounds =
    selection instanceof NodeSelection
      ? undefined
      : getBrowserSelectionBounds(view.dom);

  if (browserSelectionBounds) {
    selectionBounds.top = browserSelectionBounds.top;
    selectionBounds.bottom = browserSelectionBounds.bottom;
    selectionBounds.left = browserSelectionBounds.left;
    selectionBounds.right = browserSelectionBounds.right;
  }

  const offsetParent = menuRef.current?.offsetParent
    ? menuRef.current.offsetParent.getBoundingClientRect()
    : ({
        width: window.innerWidth,
        height: window.innerHeight,
        top: 0,
        left: 0,
        x: 0,
      } as DOMRect);

  // position at the top right of code blocks
  const isCodeNodeSelection =
    selection instanceof NodeSelection && isCode(selection.node);
  const codeBlock = isCodeNodeSelection
    ? { pos: selection.from, node: selection.node }
    : findParentNode(isCode)(view.state.selection);
  const noticeBlock = findParentNode(
    (node) => node.type.name === "container_notice",
  )(view.state.selection);

  if (
    (codeBlock || noticeBlock) &&
    (view.state.selection.empty || isCodeNodeSelection)
  ) {
    const position = codeBlock
      ? codeBlock.pos
      : noticeBlock
        ? noticeBlock.pos
        : null;

    if (position !== null) {
      const element = view.nodeDOM(position);
      const bounds = (element as HTMLElement).getBoundingClientRect();
      selectionBounds.top = bounds.top + menuHeight;
      selectionBounds.left = bounds.right;
      selectionBounds.right = bounds.right;
    }
  }

  if (!active || !menuRef.current || !menuHeight || menuWidth <= 0) {
    return defaultPosition;
  }

  // tables are an oddity, and need their own positioning logic
  const isColSelection =
    selection instanceof ColumnSelection && selection.isColSelection();
  const isRowSelection =
    selection instanceof RowSelection && selection.isRowSelection();

  if (isTableSelected(view.state)) {
    const rect = selectedRect(view.state);
    const table = view.domAtPos(rect.tableStart);
    const bounds = (table.node as HTMLElement).getBoundingClientRect();
    selectionBounds.top = bounds.top - 16;
    selectionBounds.left = bounds.left - 10;
    selectionBounds.right = bounds.left - 10;
  } else if (isColSelection) {
    const rect = selectedRect(view.state);
    const table = view.domAtPos(rect.tableStart);
    const element = (table.node as HTMLElement).querySelector(
      `tr > *:nth-child(${rect.left + 1})`,
    );
    if (element instanceof HTMLElement) {
      const bounds = element.getBoundingClientRect();
      selectionBounds.top = bounds.top - 16;
      selectionBounds.left = bounds.left;
      selectionBounds.right = bounds.right;
    }
  } else if (isRowSelection) {
    const rect = selectedRect(view.state);
    const table = view.domAtPos(rect.tableStart);
    const element = (table.node as HTMLElement).querySelector(
      `tr:nth-child(${rect.top + 1}) > *`,
    );
    if (element instanceof HTMLElement) {
      const bounds = element.getBoundingClientRect();
      selectionBounds.top = bounds.top;
      selectionBounds.left = bounds.left - 10;
      selectionBounds.right = bounds.left - 10;
    }
  }

  const isImageSelection =
    selection instanceof NodeSelection && selection.node?.type.name === "image";

  // Images need their own positioning to get the toolbar in the center
  if (isImageSelection) {
    const element = view.nodeDOM(selection.from);

    // Images are wrapped which impacts positioning - need to get the element
    // specifically tagged as the handle
    const imageElement = element
      ? (element as HTMLElement).getElementsByClassName(
          EditorStyleHelper.imageHandle,
        )[0]
      : undefined;
    if (imageElement) {
      const { left, top, width } = imageElement.getBoundingClientRect();

      return {
        left: Math.round(left + width / 2 - menuWidth / 2 - offsetParent.left),
        top: Math.round(top - menuHeight - offsetParent.top),
        offset: 0,
        visible: true,
        blockSelection: false,
        maxWidth: "100%",
      };
    }
  }

  // position the menu so that it is centered over the selection except in
  // the cases where it would extend off the edge of the screen. In these
  // instances leave a margin
  const margin = 12;
  const horizontalPosition = getFloatingToolbarHorizontalPosition({
    align,
    margin,
    menuWidth,
    offsetParent,
    selectionBounds,
    viewportWidth: window.innerWidth,
  });

  if (!horizontalPosition) {
    return defaultPosition;
  }

  const top = Math.max(
    HEADER_HEIGHT,
    Math.min(
      window.innerHeight - menuHeight - margin,
      Math.max(margin, selectionBounds.top - menuHeight - menuGap),
    ),
  );

  return {
    left: horizontalPosition.left,
    top: Math.round(top - offsetParent.top),
    offset: horizontalPosition.offset,
    maxWidth: horizontalPosition.maxWidth,
    blockSelection: !!(
      codeBlock ||
      isColSelection ||
      isRowSelection ||
      noticeBlock
    ),
    visible: true,
  };
}

const FloatingToolbar = React.forwardRef(function FloatingToolbar_(
  props: Props,
  ref: React.RefObject<HTMLDivElement>,
) {
  const menuRef = ref || React.createRef<HTMLDivElement>();
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [isSelectingText, setSelectingText] = React.useState(false);

  let position = usePosition({
    menuRef,
    contentRef,
    active: props.active,
    align: props.align,
    from: props.from,
    to: props.to,
  });

  if (isSelectingText) {
    position = defaultPosition;
  }

  useEventListener("mouseup", () => {
    setSelectingText(false);
  });

  useEventListener("mousedown", () => {
    if (!props.active) {
      setSelectingText(true);
    }
  });

  const isMobile = useMobile();
  const hasChildren = React.Children.count(props.children) > 0;
  const isMobileToolbarVisible = isMobile && !!props.active && hasChildren;

  // Keep the mobile toolbar glued to the top of the on-screen keyboard. The
  // hook tracks the visual viewport directly — see its implementation for the
  // iOS specifics.
  useKeyboardStickyOffset(menuRef, isMobileToolbarVisible);

  if (isMobile) {
    if (isMobileToolbarVisible) {
      // Vertical position (above the keyboard) is owned entirely by
      // useKeyboardStickyOffset, which writes the transform directly.
      return (
        <ReactPortal>
          <MobileWrapper ref={menuRef}>
            {props.children && (
              <MobileBackground>{props.children}</MobileBackground>
            )}
          </MobileWrapper>
        </ReactPortal>
      );
    }

    return null;
  }

  return (
    <Portal>
      <Wrapper
        active={props.active && position.visible}
        arrow={!!props.children && !position.blockSelection}
        ref={menuRef}
        $offset={position.offset}
        style={{
          minWidth: props.width,
          maxWidth: `${position.maxWidth}px`,
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        {props.children && (
          <Background
            align={props.align}
            data-floating-toolbar-content
            ref={contentRef}
          >
            {props.children}
          </Background>
        )}
      </Wrapper>
    </Portal>
  );
});

type WrapperProps = {
  active?: boolean;
  arrow?: boolean;
  $offset: number;
};

const arrow = (props: WrapperProps) =>
  props.arrow
    ? css`
        &::after {
          content: "";
          display: block;
          width: 24px;
          height: 24px;
          transform: translateX(-50%) rotate(45deg);
          background: ${s("menuBackground")};
          border-right: 1px solid ${s("divider")};
          border-bottom: 1px solid ${s("divider")};
          border-radius: 3px;
          z-index: 0;
          position: absolute;
          bottom: -2px;
          left: calc(50% - ${props.$offset || 0}px);
          pointer-events: none;

          // clip to show only the bottom right corner
          clip-path: polygon(100% 50%, 100% 100%, 50% 100%);
        }
      `
    : "";

const MobileWrapper = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  z-index: ${depths.editorToolbar};
  will-change: transform;

  @media print {
    display: none;
  }
`;

const MobileBackground = styled.div`
  padding: 10px 6px;
  height: 60px;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  background-color: ${s("menuBackground")};
  border-top: 1px solid ${s("divider")};

  &:after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    height: 100px;
  }
`;

const Background = styled.div<{ align: Props["align"] }>`
  position: relative;
  background-color: ${s("menuBackground")};
  box-shadow:
    0 0 0 1px ${s("divider")},
    0 4px 16px rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  min-height: 32px;

  ${(props) =>
    props.align === "start" &&
    `
    position: absolute;
    left: 0;
    bottom: 0;
  `}

  ${(props) =>
    props.align === "end" &&
    `
    position: absolute;
    right: 0;
    bottom: 0;
  `}
`;

// pointer-events is a discrete property and cannot be transitioned, so a
// delayed animation is used to re-enable interaction once the open animation
// has finished
const enableInteraction = keyframes`
  to {
    pointer-events: auto;
  }
`;

const Wrapper = styled.div<WrapperProps>`
  will-change: opacity, transform;
  position: absolute;
  z-index: ${depths.editorToolbar};
  opacity: 0;
  transform: scale(0.95);
  transition:
    opacity 150ms cubic-bezier(0.175, 0.885, 0.32, 1.275),
    transform 150ms cubic-bezier(0.175, 0.885, 0.32, 1.275);
  transition-delay: 150ms;
  line-height: 0;
  box-sizing: border-box;
  pointer-events: none;
  white-space: nowrap;

  ${arrow}

  * {
    box-sizing: border-box;
  }

  & button,
  & a,
  & input {
    pointer-events: none;
  }

  ${({ active }) =>
    active &&
    css`
      transform: translateY(-6px) scale(1);
      opacity: 1;

      & button,
      & a,
      & input {
        animation: ${enableInteraction} 0s 300ms forwards;
      }
    `};

  @media print {
    display: none;
  }
`;

export default FloatingToolbar;
