import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Slot } from "@radix-ui/react-slot";
import copy from "copy-to-clipboard";
import type { TFunction } from "i18next";
import {
  BlockQuoteIcon,
  BulletedListIcon,
  CodeIcon,
  CommentIcon,
  DuplicateIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  LinkIcon,
  OrderedListIcon,
  PaletteIcon,
  PlusIcon,
  ReplaceIcon,
  TextWrapIcon,
  TodoListIcon,
  TrashIcon,
} from "outline-icons";
import { NodeSelection, TextSelection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { RemoveScroll } from "react-remove-scroll";
import { toast } from "sonner";
import { transparentize } from "polished";
import styled from "styled-components";
import EventBoundary from "@shared/components/EventBoundary";
import { closeHistory } from "@shared/editor/lib/closeHistory";
import Extension from "@shared/editor/lib/Extension";
import filterExcessSeparators from "@shared/editor/lib/filterExcessSeparators";
import type { CommandFactory, WidgetProps } from "@shared/editor/lib/Extension";
import {
  blockBackgroundColorAttr,
  blockTextColorAttr,
  getBlockColorAttrs,
  hasBlockColorAttrs,
} from "@shared/editor/lib/blockColor";
import Highlight from "@shared/editor/marks/Highlight";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { depths, s } from "@shared/styles";
import { EditorStyleHelper } from "@shared/editor/styles/EditorStyleHelper";
import { skipReactUpdateMeta } from "@shared/editor/lib/transactionMeta";
import CircleIcon from "~/components/Icons/CircleIcon";
import { DottedCircleIcon } from "~/components/Icons/DottedCircleIcon";
import { toMenuItems } from "~/components/Menu/transformer";
import * as Components from "~/components/primitives/components/Menu";
import { MenuProvider } from "~/components/primitives/Menu/MenuContext";
import Tooltip from "~/components/Tooltip";
import useMobile from "~/hooks/useMobile";
import type { MenuItem as PrimitiveMenuItem } from "~/types";
import { useEditor } from "../components/EditorContext";
import { mapMenuItems } from "../menus/mapMenuItems";
import {
  createBlockBelowTransaction,
  type BlockGutterTarget,
  resolveBlockGutterTarget,
  selectionForBlockGutterTarget,
} from "./BlockGutterHelpers";

type MenuAnchor = {
  left: number;
  top: number;
};

type MenuSide = "left" | "right";

type BlockColorState = {
  backgroundColor: string | null;
  textColor: string | null;
};

type BlockColorPatch = Partial<BlockColorState>;

const controlSize = 28;
const controlsGap = 4;
const controlsWidth = controlSize * 2 + controlsGap;
const gutterGap = 12;
const hoverActivationPadding = 16;
const hideDelay = 160;
const dragImageOpacity = "0.24";

interface EditorGeometry {
  editorRect: DOMRect;
  blockLeft: number;
  blockRight: number;
}

interface MermaidBlockMeasure {
  isEditing: boolean;
  rect: DOMRect;
}

/**
 * Adds Notion-style block controls to the editor gutter.
 */
export default class BlockGutterExtension extends Extension {
  get name() {
    return "block-gutter";
  }

  widget = ({ readOnly, rtl }: WidgetProps) =>
    readOnly ? undefined : <BlockGutter rtl={rtl} />;
}

function BlockGutter({ rtl }: { rtl: boolean }) {
  const { t } = useTranslation();
  const editor = useEditor();
  const isMobile = useMobile();
  const { commands, view } = editor;
  const [target, setTarget] = React.useState<BlockGutterTarget | null>(null);
  const [targetRect, setTargetRect] = React.useState<DOMRect | null>(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [menuAnchor, setMenuAnchor] = React.useState<MenuAnchor>({
    left: 0,
    top: 0,
  });
  const handleRef = React.useRef<HTMLButtonElement | null>(null);
  const hideTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const draggingRef = React.useRef(false);
  const dragStartDocRef = React.useRef(view.state.doc);
  const dragStartSelectionRef = React.useRef<{ from: number } | null>(null);
  const mouseFrameRef = React.useRef<number | null>(null);
  const latestMousePointRef = React.useRef<{
    left: number;
    top: number;
  } | null>(null);
  const addBlockLabel = t("Insert block");
  const dragHandleLabel = t("Show menu");

  const clearHideTimer = React.useCallback(() => {
    if (!hideTimerRef.current) {
      return;
    }
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
  }, []);

  const hide = React.useCallback(() => {
    if (menuOpen) {
      return;
    }
    setTarget(null);
    setTargetRect(null);
  }, [menuOpen]);

  const scheduleHide = React.useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(hide, hideDelay);
  }, [clearHideTimer, hide]);

  const updateTarget = React.useCallback(
    (nextTarget: BlockGutterTarget | null) => {
      if (!nextTarget) {
        setTarget(null);
        setTargetRect(null);
        return;
      }

      const rect = measureTarget(view, nextTarget);
      if (!rect) {
        return;
      }

      setTarget((previous) =>
        previous?.pos === nextTarget.pos ? previous : nextTarget
      );
      setTargetRect((previous) =>
        isSameRect(previous, rect) ? previous : rect
      );
    },
    [view]
  );

  React.useEffect(() => {
    if (isMobile) {
      return undefined;
    }

    const updateFromMousePoint = () => {
      mouseFrameRef.current = null;
      const point = latestMousePointRef.current;
      latestMousePointRef.current = null;

      if (!point) {
        return;
      }

      if (draggingRef.current || menuOpen) {
        return;
      }

      const nextTarget = targetAtMouse(view, point.left, point.top, rtl);
      if (!nextTarget) {
        scheduleHide();
        return;
      }

      clearHideTimer();
      updateTarget(nextTarget);
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (draggingRef.current || menuOpen) {
        return;
      }

      latestMousePointRef.current = {
        left: event.clientX,
        top: event.clientY,
      };

      if (mouseFrameRef.current !== null) {
        return;
      }

      mouseFrameRef.current =
        window.requestAnimationFrame(updateFromMousePoint);
    };

    const handleMouseLeave = () => scheduleHide();

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      if (mouseFrameRef.current !== null) {
        window.cancelAnimationFrame(mouseFrameRef.current);
        mouseFrameRef.current = null;
      }
    };
  }, [clearHideTimer, isMobile, menuOpen, rtl, scheduleHide, updateTarget, view]);

  React.useEffect(() => {
    if (!target) {
      return;
    }

    const reposition = () => {
      setTargetRect(measureTarget(view, target));
    };

    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);

    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [target, view]);

  React.useEffect(
    () => () => {
      clearHideTimer();
    },
    [clearHideTimer]
  );

  const handleAddBlock = React.useCallback(() => {
    if (!target) {
      return;
    }

    const tr = createBlockBelowTransaction(view.state, target);
    if (!tr) {
      return;
    }

    view.dispatch(tr);
    commands.openBlockMenu?.({});
  }, [commands, target, view]);

  const handleAddMouseDown = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
    },
    []
  );

  const handleDragHandleMouseDown = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
    },
    []
  );

  const handleDragStart = React.useCallback(
    (event: React.DragEvent<HTMLButtonElement>) => {
      if (!target) {
        return;
      }

      draggingRef.current = true;
      dragStartDocRef.current = view.state.doc;
      dragStartSelectionRef.current = { from: view.state.selection.from };
      const selection = selectionForBlockGutterDrag(view, target);
      view.dispatch(
        view.state.tr
          .setSelection(selection)
          .setMeta(skipReactUpdateMeta, true)
          .setMeta("addToHistory", false)
      );
      view.dragging = { slice: view.state.selection.content(), move: true };
      view.dom.classList.add("block-gutter-dragging");
      view.dom.classList.add("ProseMirror-hideselection");

      const dom = view.nodeDOM(target.pos);
      if (dom instanceof HTMLElement) {
        setDragImage(event, dom);
      }

      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", target.node.textContent || " ");
    },
    [target, view]
  );

  const handleDragEnd = React.useCallback(() => {
    draggingRef.current = false;
    view.dom.classList.remove("block-gutter-dragging");
    view.dom.classList.remove("ProseMirror-hideselection");
    if (
      dragStartSelectionRef.current &&
      dragStartDocRef.current.eq(view.state.doc)
    ) {
      const restorePos = Math.min(
        dragStartSelectionRef.current.from,
        view.state.doc.content.size
      );
      view.dispatch(
        view.state.tr
          .setSelection(TextSelection.near(view.state.doc.resolve(restorePos)))
          .setMeta(skipReactUpdateMeta, true)
          .setMeta("addToHistory", false)
      );
    }
    dragStartSelectionRef.current = null;
    setTarget(null);
    setTargetRect(null);
  }, [view]);

  const handleMenuClick = React.useCallback(() => {
    if (!target || draggingRef.current) {
      return;
    }

    const rect = handleRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuAnchor({
        left: rtl ? rect.right : rect.left,
        top: rect.top,
      });
    }
    setMenuOpen(true);
  }, [rtl, target]);

  const handleMenuOpenChange = React.useCallback(
    (open: boolean) => {
      setMenuOpen(open);
      if (open) {
        return;
      }
      scheduleHide();
    },
    [scheduleHide]
  );

  const handleCloseAutoFocus = React.useCallback((event: Event) => {
    event.preventDefault();
  }, []);

  const mappedMenuItems = React.useMemo<PrimitiveMenuItem[]>(() => {
    if (!menuOpen || !target) {
      return [];
    }

    const items = blockMenuItems({
      commands,
      target,
      t,
      view,
      onAfterAction: () => {
        setMenuOpen(false);
      },
    });

    return mapMenuItems(items, commands, view, view.state);
  }, [commands, menuOpen, t, target, view]);

  if (isMobile) {
    return null;
  }

  if (!target || !targetRect) {
    return (
      <BlockOptionsMenu
        anchor={menuAnchor}
        items={mappedMenuItems}
        onCloseAutoFocus={handleCloseAutoFocus}
        onOpenChange={handleMenuOpenChange}
        open={menuOpen}
        side={rtl ? "right" : "left"}
      />
    );
  }

  return (
    <>
      {menuOpen && targetRect && (
        <BlockActiveOverlay style={activeOverlayPosition(targetRect, view)} />
      )}
      <GutterControls
        $rtl={rtl}
        contentEditable={false}
        onMouseEnter={clearHideTimer}
        onMouseLeave={scheduleHide}
        style={controlPosition(targetRect, target, view, rtl)}
      >
        <Tooltip content={addBlockLabel} placement="top" delayDuration={250}>
          <GutterButton
            type="button"
            aria-label={addBlockLabel}
            onMouseDown={handleAddMouseDown}
            onClick={handleAddBlock}
          >
            <PlusIcon size={18} />
          </GutterButton>
        </Tooltip>
        <Tooltip content={dragHandleLabel} placement="top" delayDuration={250}>
          <GutterButton
            ref={handleRef}
            type="button"
            aria-label={dragHandleLabel}
            draggable
            onMouseDown={handleDragHandleMouseDown}
            onClick={handleMenuClick}
            onDragEnd={handleDragEnd}
            onDragStart={handleDragStart}
            $dragHandle
          >
            <GripDots aria-hidden />
          </GutterButton>
        </Tooltip>
      </GutterControls>

      <BlockOptionsMenu
        anchor={menuAnchor}
        items={mappedMenuItems}
        onCloseAutoFocus={handleCloseAutoFocus}
        onOpenChange={handleMenuOpenChange}
        open={menuOpen}
        side={rtl ? "right" : "left"}
      />
    </>
  );
}

function BlockOptionsMenu({
  anchor,
  items,
  onCloseAutoFocus,
  onOpenChange,
  open,
  side,
}: {
  anchor: MenuAnchor;
  items: PrimitiveMenuItem[];
  onCloseAutoFocus: (event: Event) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  side: MenuSide;
}) {
  const { t } = useTranslation();

  return (
    <MenuProvider variant="dropdown">
      <DropdownMenuPrimitive.Root
        open={open}
        onOpenChange={onOpenChange}
        modal={false}
      >
        <DropdownMenuPrimitive.Trigger asChild>
          <div
            aria-hidden
            style={{
              position: "fixed",
              width: 0,
              height: 0,
              left: anchor.left,
              top: anchor.top,
            }}
          />
        </DropdownMenuPrimitive.Trigger>
        <DropdownMenuPrimitive.Portal>
          <DropdownMenuPrimitive.Content
            side={side}
            align="start"
            sideOffset={8}
            collisionPadding={8}
            aria-label={t("Show menu")}
            onCloseAutoFocus={onCloseAutoFocus}
            asChild
          >
            <RemoveScroll as={Slot} allowPinchZoom>
              <Components.MenuContent
                maxHeightVar="--radix-dropdown-menu-content-available-height"
                transformOriginVar="--radix-dropdown-menu-content-transform-origin"
                hiddenScrollbars
              >
                <EventBoundary>{toMenuItems(items)}</EventBoundary>
              </Components.MenuContent>
            </RemoveScroll>
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Portal>
      </DropdownMenuPrimitive.Root>
    </MenuProvider>
  );
}

function blockMenuItems({
  commands,
  onAfterAction,
  target,
  t,
  view,
}: {
  commands: Record<string, CommandFactory>;
  onAfterAction: () => void;
  target: BlockGutterTarget;
  t: TFunction;
  view: EditorView;
}) {
  const blockColor = getTargetBlockColor(target);

  return filterExcessSeparators([
    {
      name: "turnInto",
      label: t("Format"),
      icon: <ReplaceIcon />,
      children: turnIntoItems({
        commands,
        onAfterAction,
        t,
        target,
        view,
      }),
    },
    {
      name: "blockBackgroundColor",
      label: t("Background color"),
      icon: blockColor.backgroundColor ? (
        <CircleIcon retainColor color={blockColor.backgroundColor} />
      ) : (
        <PaletteIcon />
      ),
      children: blockBackgroundColorItems({
        blockColor,
        onAfterAction,
        t,
        target,
        view,
      }),
    },
    {
      name: "blockTextColor",
      label: t("Text"),
      icon: blockColor.textColor ? (
        <CircleIcon retainColor color={blockColor.textColor} />
      ) : (
        <TextWrapIcon />
      ),
      children: blockTextColorItems({
        blockColor,
        onAfterAction,
        t,
        target,
        view,
      }),
    },
    { name: "separator" },
    {
      name: "duplicateBlock",
      label: t("Duplicate"),
      icon: <DuplicateIcon />,
      onClick: () => {
        duplicateTarget(view, target);
        onAfterAction();
      },
    },
    {
      name: "copyBlockLink",
      label: t("Copy link"),
      icon: <LinkIcon />,
      onClick: () => {
        copyBlockLink(view, target, t);
        onAfterAction();
      },
    },
    {
      name: "blockGutterComment",
      label: t("Comment"),
      icon: <CommentIcon />,
      visible: !!commands.comment,
      onClick: () => {
        executeCommandOnTarget({
          commandName: "comment",
          commands,
          target,
          view,
        });
        onAfterAction();
      },
    },
    { name: "separator" },
    {
      name: "deleteBlock",
      label: t("Delete"),
      icon: <TrashIcon />,
      dangerous: true,
      onClick: () => {
        deleteTarget(view, target);
        onAfterAction();
      },
    },
  ]);
}

function turnIntoItems({
  commands,
  onAfterAction,
  t,
  target,
  view,
}: {
  commands: Record<string, CommandFactory>;
  onAfterAction: () => void;
  t: TFunction;
  target: BlockGutterTarget;
  view: EditorView;
}) {
  const item = (
    commandName: string,
    label: string,
    icon: React.ReactNode,
    attrs?: unknown
  ) => ({
    name: `blockGutter${commandName}${attrs ? JSON.stringify(attrs) : ""}`,
    label,
    icon,
    onClick: () => {
      executeCommandOnTarget({
        attrs,
        commandName,
        commands,
        target,
        view,
      });
      onAfterAction();
    },
  });

  return [
    item("paragraph", t("Text"), <TextWrapIcon />),
    item("heading", t("Big heading"), <Heading1Icon />, { level: 1 }),
    item("heading", t("Medium heading"), <Heading2Icon />, { level: 2 }),
    item("heading", t("Small heading"), <Heading3Icon />, { level: 3 }),
    item("checkbox_list", t("Todo list"), <TodoListIcon />),
    item("bullet_list", t("Bulleted list"), <BulletedListIcon />),
    item("ordered_list", t("Ordered list"), <OrderedListIcon />),
    item("blockquote", t("Quote"), <BlockQuoteIcon />),
    item("code_block", t("Code block"), <CodeIcon />),
  ];
}

function executeCommandOnTarget({
  attrs,
  commandName,
  commands,
  target,
  view,
}: {
  attrs?: unknown;
  commandName: string;
  commands: Record<string, CommandFactory>;
  target: BlockGutterTarget;
  view: EditorView;
}) {
  const command = commands[commandName];
  if (!command) {
    return;
  }

  view.dispatch(
    view.state.tr
      .setSelection(selectionForBlockGutterTarget(view.state, target))
      .setMeta(skipReactUpdateMeta, true)
      .setMeta("addToHistory", false)
  );
  command(attrs);
}

function duplicateTarget(view: EditorView, target: BlockGutterTarget) {
  const insertPos = target.pos + target.node.nodeSize;
  const tr = view.state.tr.insert(insertPos, target.node);
  closeHistory(view);
  view.dispatch(tr.scrollIntoView());
  closeHistory(view);
}

function deleteTarget(view: EditorView, target: BlockGutterTarget) {
  const { state } = view;
  const paragraph = state.schema.nodes.paragraph.createAndFill();
  if (!paragraph) {
    return;
  }

  const range = deletionRangeForTarget(target);
  const onlyDocBlock = range.from === 0 && state.doc.childCount === 1;
  const tr = onlyDocBlock
    ? state.tr.replaceWith(range.from, range.to, paragraph)
    : state.tr.delete(range.from, range.to);

  closeHistory(view);
  view.dispatch(tr.scrollIntoView());
  closeHistory(view);
}

function copyBlockLink(
  view: EditorView,
  target: BlockGutterTarget,
  t: TFunction
) {
  const anchor = ProsemirrorHelper.getAnchors(view.state.doc).find(
    (candidate) => anchorPositionsForTarget(target).has(candidate.pos)
  );
  const hash = anchor ? `#${anchor.id}` : "";
  const url = window.location.href.split("#")[0].replace("/edit", "");
  copy(`${url}${hash}`);
  toast.message(t("Link copied to clipboard"));
}

function blockBackgroundColorItems({
  blockColor,
  onAfterAction,
  t,
  target,
  view,
}: {
  blockColor: BlockColorState;
  onAfterAction: () => void;
  t: TFunction;
  target: BlockGutterTarget;
  view: EditorView;
}) {
  return [
    {
      name: "clearBlockBackgroundColor",
      label: t("None"),
      icon: <DottedCircleIcon retainColor color="transparent" />,
      active: () => blockColor.backgroundColor === null,
      onClick: () => {
        setTargetBlockColor(view, target, { backgroundColor: null });
        onAfterAction();
      },
    },
    ...Highlight.presetColors.map((preset) => ({
      name: `setBlockBackgroundColor-${preset.hex}`,
      label: preset.name,
      icon: <CircleIcon retainColor color={preset.hex} />,
      active: () => blockColor.backgroundColor === preset.hex,
      onClick: () => {
        setTargetBlockColor(view, target, { backgroundColor: preset.hex });
        onAfterAction();
      },
    })),
  ];
}

function blockTextColorItems({
  blockColor,
  onAfterAction,
  t,
  target,
  view,
}: {
  blockColor: BlockColorState;
  onAfterAction: () => void;
  t: TFunction;
  target: BlockGutterTarget;
  view: EditorView;
}) {
  return [
    {
      name: "clearBlockTextColor",
      label: t("Default"),
      icon: <DottedCircleIcon retainColor color="transparent" />,
      active: () => blockColor.textColor === null,
      onClick: () => {
        setTargetBlockColor(view, target, { textColor: null });
        onAfterAction();
      },
    },
    ...Highlight.presetColors.map((preset) => ({
      name: `setBlockTextColor-${preset.hex}`,
      label: preset.name,
      icon: <CircleIcon retainColor color={preset.hex} />,
      active: () => blockColor.textColor === preset.hex,
      onClick: () => {
        setTargetBlockColor(view, target, { textColor: preset.hex });
        onAfterAction();
      },
    })),
  ];
}

function getTargetBlockColor(target: BlockGutterTarget): BlockColorState {
  const attrs = getBlockColorAttrs(target.node);
  if (hasBlockColorAttrs(target.node)) {
    return attrs;
  }

  let blockColor: BlockColorState = {
    backgroundColor: null,
    textColor: null,
  };

  target.node.descendants((node) => {
    if (!node.isText) {
      return true;
    }

    const mark = node.marks.find(
      (candidate) =>
        candidate.type.name === "highlight" && candidate.attrs.scope === "block"
    );
    if (mark) {
      blockColor = {
        backgroundColor: getHexColor(mark.attrs.color),
        textColor: getHexColor(mark.attrs.textColor),
      };
      return false;
    }

    return true;
  });

  return blockColor;
}

function setTargetBlockColor(
  view: EditorView,
  target: BlockGutterTarget,
  patch: BlockColorPatch
) {
  const current = getTargetBlockColor(target);
  const next = { ...current, ...patch };
  let tr = view.state.tr;
  const markType = view.state.schema.marks.highlight;

  if (markType) {
    target.node.descendants((node, pos) => {
      if (!node.isText) {
        return true;
      }

      const from = target.pos + 1 + pos;
      const to = from + node.nodeSize;

      node.marks.forEach((mark) => {
        if (mark.type === markType && mark.attrs.scope === "block") {
          tr = tr.removeMark(from, to, mark);
        }
      });

      return true;
    });
  }

  tr = tr.setNodeMarkup(
    target.pos,
    undefined,
    {
      ...target.node.attrs,
      [blockBackgroundColorAttr]: next.backgroundColor,
      [blockTextColorAttr]: next.textColor,
    },
    target.node.marks
  );

  target.node.descendants((node, pos) => {
    if (!node.isBlock || !hasBlockColorAttrs(node)) {
      return true;
    }

    tr = tr.setNodeMarkup(
      target.pos + 1 + pos,
      undefined,
      {
        ...node.attrs,
        [blockBackgroundColorAttr]: null,
        [blockTextColorAttr]: null,
      },
      node.marks
    );

    return true;
  });

  closeHistory(view);
  view.dispatch(tr);
  closeHistory(view);
}

function getHexColor(value: unknown): string | null {
  return typeof value === "string" && value.startsWith("#") ? value : null;
}

function selectionForBlockGutterDrag(
  view: EditorView,
  target: BlockGutterTarget
) {
  return NodeSelection.create(view.state.doc, target.pos);
}

function deletionRangeForTarget(target: BlockGutterTarget) {
  let from = target.pos;
  let node = target.node;

  for (let index = target.ancestors.length - 1; index >= 0; index--) {
    const ancestor = target.ancestors[index];
    if (ancestor.node.childCount !== 1) {
      break;
    }

    from = ancestor.pos;
    node = ancestor.node;
  }

  return { from, to: from + node.nodeSize };
}

function anchorPositionsForTarget(target: BlockGutterTarget) {
  return new Set([
    target.pos,
    ...target.ancestors.map((ancestor) => ancestor.pos),
  ]);
}

function setDragImage(
  event: React.DragEvent<HTMLButtonElement>,
  source: HTMLElement
) {
  const ghost = source.cloneNode(true);
  if (!(ghost instanceof HTMLElement)) {
    return;
  }

  ghost.classList.add("block-gutter-drag-image");
  ghost.style.position = "fixed";
  ghost.style.top = "-10000px";
  ghost.style.left = "0";
  ghost.style.width = `${source.offsetWidth}px`;
  ghost.style.boxShadow = "none";
  ghost.style.pointerEvents = "none";
  ghost.style.opacity = dragImageOpacity;

  document.body.appendChild(ghost);
  event.dataTransfer.setDragImage(ghost, 0, 0);
  window.setTimeout(() => ghost.remove(), 0);
}

function targetAtMouse(
  view: EditorView,
  left: number,
  top: number,
  rtl: boolean
) {
  const geometry = editorGeometry(view);
  if (top < geometry.editorRect.top || top > geometry.editorRect.bottom) {
    return null;
  }

  if (!isInActivationBand(left, geometry, rtl)) {
    return null;
  }

  let bestTarget: { target: BlockGutterTarget; rect: DOMRect } | null = null;
  for (const probeLeft of probeXs(geometry, left, rtl)) {
    const diagramTarget = mermaidTargetAtPoint(view, probeLeft, top);
    if (diagramTarget) {
      const rect = measureTarget(view, diagramTarget);
      if (rect && containsY(rect, top)) {
        bestTarget = betterTarget(bestTarget, {
          target: diagramTarget,
          rect,
        });
      }
    }

    const result = view.posAtCoords({ left: probeLeft, top });
    if (!result) {
      continue;
    }

    for (const pos of candidatePositions(result)) {
      const target = resolveBlockGutterTarget(view.state, pos);
      if (!target) {
        continue;
      }

      const rect = measureTarget(view, target);
      if (!rect || !containsY(rect, top)) {
        continue;
      }

      bestTarget = betterTarget(bestTarget, { target, rect });
    }
  }

  return bestTarget?.target ?? null;
}

function editorGeometry(view: EditorView): EditorGeometry {
  const editorRect = view.dom.getBoundingClientRect();

  return {
    editorRect,
    blockLeft: editorRect.left,
    blockRight: editorRect.right,
  };
}

function isInActivationBand(
  left: number,
  geometry: EditorGeometry,
  rtl: boolean
) {
  if (rtl) {
    return (
      left >= geometry.blockLeft - hoverActivationPadding &&
      left <=
        geometry.blockRight + controlsWidth + gutterGap + hoverActivationPadding
    );
  }

  return (
    left >=
      geometry.blockLeft - controlsWidth - gutterGap - hoverActivationPadding &&
    left <= geometry.blockRight + hoverActivationPadding
  );
}

function candidatePositions(result: { pos: number; inside: number }) {
  return Array.from(
    new Set([...(result.inside >= 0 ? [result.inside] : []), result.pos])
  );
}

function probeXs(geometry: EditorGeometry, pointerX: number, rtl: boolean) {
  const probeOffsets = [8, 32, 64, 96, 128, 192];
  const edgeProbes = probeOffsets.map((offset) =>
    rtl ? geometry.blockRight - offset : geometry.blockLeft + offset
  );
  const pointerInsideContent = Math.max(
    geometry.blockLeft + 1,
    Math.min(geometry.blockRight - 1, pointerX)
  );

  return Array.from(new Set([...edgeProbes, pointerInsideContent])).filter(
    (value) =>
      Number.isFinite(value) &&
      value > geometry.blockLeft &&
      value < geometry.blockRight
  );
}

function betterTarget(
  current: { target: BlockGutterTarget; rect: DOMRect } | null,
  next: { target: BlockGutterTarget; rect: DOMRect }
) {
  if (!current) {
    return next;
  }

  if (next.target.depth > current.target.depth) {
    return next;
  }

  if (
    next.target.depth === current.target.depth &&
    next.rect.height < current.rect.height
  ) {
    return next;
  }

  return current;
}

function containsY(rect: DOMRect, y: number) {
  return y >= rect.top - 1 && y <= rect.bottom + 1;
}

function measureTarget(view: EditorView, target: BlockGutterTarget) {
  const dom = view.nodeDOM(target.pos);
  if (!(dom instanceof HTMLElement)) {
    return null;
  }

  const mermaidMeasure = measureMermaidBlock(dom);
  if (mermaidMeasure) {
    return mermaidMeasure.rect;
  }

  return dom.getBoundingClientRect();
}

function isSameRect(previous: DOMRect | null, next: DOMRect) {
  if (!previous) {
    return false;
  }

  return (
    Math.abs(previous.top - next.top) < 0.5 &&
    Math.abs(previous.left - next.left) < 0.5 &&
    Math.abs(previous.width - next.width) < 0.5 &&
    Math.abs(previous.height - next.height) < 0.5
  );
}

function controlPosition(
  rect: DOMRect,
  target: BlockGutterTarget,
  view: EditorView,
  rtl: boolean
): React.CSSProperties {
  const geometry = editorGeometry(view);

  return {
    left: rtl
      ? geometry.blockRight + gutterGap
      : geometry.blockLeft - gutterGap,
    top: rect.top + firstLineOffset(view, target),
  };
}

function activeOverlayPosition(
  rect: DOMRect,
  view: EditorView
): React.CSSProperties {
  const geometry = editorGeometry(view);
  const left = Math.min(geometry.blockLeft, rect.left) - 6;
  const right = Math.max(geometry.blockRight, rect.right) + 6;

  return {
    left,
    top: rect.top - 2,
    width: right - left,
    height: rect.height + 4,
  };
}

function firstLineOffset(view: EditorView, target: BlockGutterTarget) {
  const dom = view.nodeDOM(target.pos);
  if (!(dom instanceof HTMLElement)) {
    return 12;
  }

  const mermaidMeasure = measureMermaidBlock(dom);
  if (mermaidMeasure && !mermaidMeasure.isEditing) {
    return Math.max(
      controlSize / 2,
      Math.min(24, mermaidMeasure.rect.height / 2)
    );
  }

  const lineElement = firstLineElement(dom);
  const source = lineElement ?? dom;
  const sourceRect = source.getBoundingClientRect();
  const domRect = mermaidMeasure?.rect ?? dom.getBoundingClientRect();
  const styles = window.getComputedStyle(source);
  const lineHeight = measuredLineHeight(styles);
  const paddingTop = lineElement ? 0 : parseFloat(styles.paddingTop) || 0;

  return sourceRect.top - domRect.top + paddingTop + lineHeight / 2;
}

function firstLineElement(dom: HTMLElement) {
  const textContentSelector = `.${EditorStyleHelper.blockContent}:is(p, h1, h2, h3, h4, h5, h6)`;

  if (dom.classList.contains(EditorStyleHelper.toggleBlock)) {
    return dom.querySelector<HTMLElement>(
      `:scope > .${EditorStyleHelper.toggleBlockContent} > .${EditorStyleHelper.toggleBlockHead} > ${textContentSelector}`
    );
  }

  return dom.querySelector<HTMLElement>(
    [
      `:scope > ${textContentSelector}`,
      `:scope > .${EditorStyleHelper.blockContent} > .${EditorStyleHelper.blockView} > ${textContentSelector}`,
      `:scope > .${EditorStyleHelper.blockContent} > .${EditorStyleHelper.toggleBlock}`,
      `:scope > .${EditorStyleHelper.blockContent} > blockquote.${EditorStyleHelper.blockView}`,
      ":scope > div > :is(p, h1, h2, h3, h4, h5, h6, blockquote)",
      `:scope > .${EditorStyleHelper.toggleBlock}`,
    ].join(", ")
  );
}

function measuredLineHeight(styles: CSSStyleDeclaration) {
  return (
    parseFloat(styles.lineHeight) || parseFloat(styles.fontSize) * 1.4 || 24
  );
}

function mermaidTargetAtPoint(
  view: EditorView,
  left: number,
  top: number
): BlockGutterTarget | null {
  const element = view.dom.ownerDocument.elementFromPoint(left, top);
  const diagram = mermaidDiagramFromElement(element);
  if (!diagram) {
    return null;
  }

  const codeBlock = previousMermaidCodeBlock(diagram);
  if (!codeBlock) {
    return null;
  }

  return targetFromCodeBlockElement(view, codeBlock);
}

function targetFromCodeBlockElement(
  view: EditorView,
  codeBlock: HTMLElement
): BlockGutterTarget | null {
  const pos = view.posAtDOM(codeBlock, 0);
  const target = resolveBlockGutterTarget(view.state, pos);
  if (target && isMermaidCodeBlockElement(view.nodeDOM(target.pos))) {
    return target;
  }

  const $pos = view.state.doc.resolve(pos);
  if ($pos.depth === 0) {
    return null;
  }

  const parentTarget = resolveBlockGutterTarget(view.state, $pos.before());
  return parentTarget && isMermaidCodeBlockElement(view.nodeDOM(parentTarget.pos))
    ? parentTarget
    : null;
}

function measureMermaidBlock(codeBlock: HTMLElement): MermaidBlockMeasure | null {
  if (!isMermaidCodeBlockElement(codeBlock)) {
    return null;
  }

  const diagram = nextMermaidDiagram(codeBlock);
  if (!diagram) {
    return null;
  }

  const isEditing = codeBlock.classList.contains("code-active");
  const diagramRect = diagram.getBoundingClientRect();

  return {
    isEditing,
    rect: isEditing
      ? unionRects([codeBlock.getBoundingClientRect(), diagramRect])
      : diagramRect,
  };
}

function isMermaidCodeBlockElement(
  element: Element | null
): element is HTMLElement {
  return (
    element instanceof HTMLElement &&
    element.classList.contains(EditorStyleHelper.codeBlock) &&
    (element.dataset.language === "mermaid" ||
      element.dataset.language === "mermaidjs")
  );
}

function mermaidDiagramFromElement(element: Element | null): HTMLElement | null {
  const diagram = element?.closest(".mermaid-diagram-wrapper");
  return diagram instanceof HTMLElement ? diagram : null;
}

function nextMermaidDiagram(codeBlock: HTMLElement): HTMLElement | null {
  const next = codeBlock.nextElementSibling;
  return next instanceof HTMLElement &&
    next.classList.contains("mermaid-diagram-wrapper")
    ? next
    : null;
}

function previousMermaidCodeBlock(diagram: HTMLElement): HTMLElement | null {
  const previous = diagram.previousElementSibling;
  return isMermaidCodeBlockElement(previous) ? previous : null;
}

function unionRects(rects: DOMRect[]): DOMRect {
  const left = Math.min(...rects.map((rect) => rect.left));
  const top = Math.min(...rects.map((rect) => rect.top));
  const right = Math.max(...rects.map((rect) => rect.right));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));

  return new DOMRect(left, top, right - left, bottom - top);
}

const GutterControls = styled.div<{ $rtl: boolean }>`
  position: fixed;
  z-index: ${depths.editorToolbar};
  display: flex;
  align-items: center;
  gap: ${controlsGap}px;
  width: ${controlsWidth}px;
  height: ${controlSize}px;
  box-sizing: border-box;
  background: transparent;
  transform: ${(props) =>
    props.$rtl ? "translate(0, -50%)" : "translate(-100%, -50%)"};
  user-select: none;

  @media print {
    display: none;
  }
`;

const BlockActiveOverlay = styled.div`
  position: fixed;
  z-index: ${depths.editorToolbar - 1};
  border-radius: ${EditorStyleHelper.blockRadius};
  background: ${(props) => transparentize(0.88, props.theme.accent)};
  pointer-events: none;
`;

const GutterButton = styled.button<{ $dragHandle?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${controlSize}px;
  height: ${controlSize}px;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: ${s("textTertiary")};
  cursor: ${(props) => (props.$dragHandle ? "grab" : "var(--pointer)")};
  transition:
    background 120ms ease,
    color 120ms ease;

  &:hover,
  &:focus-visible {
    color: ${s("text")};
    background: ${s("buttonNeutralHoverBackground")};
  }

  &:active {
    cursor: ${(props) => (props.$dragHandle ? "grabbing" : "var(--pointer)")};
  }
`;

const GripDots = styled.span`
  display: block;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: currentColor;
  box-shadow:
    6px 0 0 currentColor,
    0 6px 0 currentColor,
    6px 6px 0 currentColor,
    0 12px 0 currentColor,
    6px 12px 0 currentColor;
  transform: translate(-3px, -6px);
`;
