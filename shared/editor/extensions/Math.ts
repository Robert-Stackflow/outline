import { MathView } from "@benrbray/prosemirror-math";
import { isNode } from "@shared/utils/browser";
import type { PluginSpec, Transaction } from "prosemirror-state";
import { Plugin, PluginKey } from "prosemirror-state";
import type { NodeViewConstructor } from "prosemirror-view";
import { attachBlockViewHalo } from "../lib/blockView";

export interface IMathPluginState {
  macros: { [cmd: string]: string };
  activeNodeViews: MathView[];
  prevCursorPos: number;
}

const MATH_PLUGIN_KEY = new PluginKey<IMathPluginState>("prosemirror-math");
const PREVIEW_OFFSET = 10;
const PREVIEW_VIEWPORT_MARGIN = 12;

interface PreviewBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

class PreviewMathView extends MathView {
  private previewElement?: HTMLElement;
  private positionFrame: number | undefined;
  private blockHeightFrame: number | undefined;
  private isTrackingPosition = false;

  public destroy() {
    this.cancelBlockHeightSync();
    this.destroyPreview();
    super.destroy();
  }

  public selectNode() {
    this.syncBlockEditorHeight();
    super.selectNode();
    this.showPreview();
    this.scheduleBlockHeightSync();
  }

  public deselectNode() {
    this.hidePreview();
    super.deselectNode();
  }

  public renderMath() {
    super.renderMath();
    this.scheduleBlockHeightSync();
    this.syncPreview();
  }

  public dispatchInner(tr: Transaction) {
    super.dispatchInner(tr);

    if (tr.docChanged && !tr.getMeta("fromOutside")) {
      this.renderMath();
    }
  }

  private showPreview() {
    this.syncPreview();
    this.startTrackingPosition();
    this.schedulePreviewPosition();
  }

  private scheduleBlockHeightSync() {
    if (!this.isBlockMath()) {
      return;
    }

    const previewWindow = this.dom.ownerDocument.defaultView;
    if (!previewWindow) {
      this.syncBlockEditorHeight();
      return;
    }

    if (this.blockHeightFrame !== undefined) {
      return;
    }

    this.blockHeightFrame = previewWindow.requestAnimationFrame(() => {
      this.blockHeightFrame = undefined;
      this.syncBlockEditorHeight();
    });
  }

  private syncBlockEditorHeight() {
    if (!this.isBlockMath()) {
      return;
    }

    const renderElement = this.dom.querySelector<HTMLElement>(
      ":scope > .math-render"
    );
    if (!renderElement) {
      return;
    }

    const height = this.measureRenderHeight(renderElement);
    if (height <= 0) {
      return;
    }

    this.dom.style.setProperty("--math-render-height", `${height}px`);
  }

  private measureRenderHeight(renderElement: HTMLElement) {
    const visibleHeight = Math.ceil(
      renderElement.getBoundingClientRect().height
    );
    if (visibleHeight > 0) {
      return visibleHeight;
    }

    const ownerDocument = this.dom.ownerDocument;
    const host = this.dom.cloneNode(false);
    const clonedRenderElement = renderElement.cloneNode(true);
    if (
      !(host instanceof HTMLElement) ||
      !(clonedRenderElement instanceof HTMLElement) ||
      !ownerDocument.body
    ) {
      return 0;
    }

    host.classList.remove("ProseMirror-selectednode");
    host.style.position = "absolute";
    host.style.visibility = "hidden";
    host.style.pointerEvents = "none";
    host.style.inset = "0 auto auto -10000px";
    host.style.width = `${Math.ceil(this.dom.getBoundingClientRect().width)}px`;
    host.appendChild(clonedRenderElement);
    ownerDocument.body.appendChild(host);

    const measuredHeight = Math.ceil(
      clonedRenderElement.getBoundingClientRect().height
    );
    host.remove();
    return measuredHeight;
  }

  private isBlockMath() {
    const tagName = this.dom.tagName.toLowerCase();
    return tagName === "math-block" || tagName === "math-display";
  }

  private hidePreview() {
    this.stopTrackingPosition();
    this.cancelPreviewPosition();
    this.previewElement?.classList.remove("is-visible");
    if (this.previewElement) {
      this.previewElement.hidden = true;
    }
  }

  private syncPreview() {
    if (!this.dom.classList.contains("ProseMirror-selectednode")) {
      return;
    }

    const renderElement = this.dom.querySelector<HTMLElement>(
      ":scope > .math-render"
    );
    if (!renderElement) {
      this.hidePreview();
      return;
    }

    const previewElement = this.ensurePreviewElement();
    if (!previewElement) {
      return;
    }

    previewElement.classList.toggle(
      "parse-error",
      renderElement.classList.contains("parse-error")
    );
    previewElement.classList.toggle(
      "empty-math",
      this.dom.classList.contains("empty-math")
    );
    previewElement.classList.toggle(
      "math-inline-preview",
      this.dom.tagName.toLowerCase() === "math-inline"
    );
    previewElement.replaceChildren(
      ...Array.from(renderElement.childNodes).map((child) =>
        child.cloneNode(true)
      )
    );
    previewElement.hidden = false;
    previewElement.classList.add("is-visible");
    this.schedulePreviewPosition();
  }

  private ensurePreviewElement() {
    if (this.previewElement) {
      return this.previewElement;
    }

    const previewRoot = this.getPreviewRoot();
    if (!previewRoot) {
      return undefined;
    }

    const previewElement = this.dom.ownerDocument.createElement("div");
    previewElement.classList.add("math-preview-popover");
    previewElement.setAttribute("contenteditable", "false");
    previewElement.setAttribute("role", "tooltip");
    previewElement.hidden = true;
    previewRoot.appendChild(previewElement);
    this.previewElement = previewElement;
    return previewElement;
  }

  private getPreviewRoot() {
    const editorRoot = this.dom.closest(".ProseMirror");
    if (editorRoot?.parentElement) {
      return editorRoot.parentElement;
    }

    return this.dom.ownerDocument.body;
  }

  private schedulePreviewPosition = () => {
    const previewWindow = this.dom.ownerDocument.defaultView;
    if (!previewWindow || this.positionFrame !== undefined) {
      return;
    }

    this.positionFrame = previewWindow.requestAnimationFrame(() => {
      this.positionFrame = undefined;
      this.updatePreviewPosition();
    });
  };

  private updatePreviewPosition() {
    if (!this.previewElement || this.previewElement.hidden) {
      return;
    }

    const previewWindow = this.dom.ownerDocument.defaultView;
    if (!previewWindow) {
      return;
    }

    const anchorRect = this.dom.getBoundingClientRect();
    const bounds = this.getPreviewBounds(previewWindow);
    const maxWidth = Math.max(1, Math.round(bounds.right - bounds.left));
    const maxHeight = Math.max(1, Math.round(bounds.bottom - bounds.top));

    this.previewElement.style.maxWidth = `${maxWidth}px`;
    this.previewElement.style.maxHeight = `${maxHeight}px`;

    const previewRect = this.previewElement.getBoundingClientRect();
    const desiredLeft =
      anchorRect.left + anchorRect.width / 2 - previewRect.width / 2;
    const left = clamp(
      desiredLeft,
      bounds.left,
      bounds.right - previewRect.width
    );
    const spaceAbove = anchorRect.top - bounds.top - PREVIEW_OFFSET;
    const spaceBelow = bounds.bottom - anchorRect.bottom - PREVIEW_OFFSET;
    const shouldPlaceAbove =
      spaceAbove >= previewRect.height || spaceAbove >= spaceBelow;
    const desiredTop = shouldPlaceAbove
      ? anchorRect.top - previewRect.height - PREVIEW_OFFSET
      : anchorRect.bottom + PREVIEW_OFFSET;
    const top = clamp(
      desiredTop,
      bounds.top,
      bounds.bottom - previewRect.height
    );

    this.previewElement.classList.toggle("placement-below", !shouldPlaceAbove);
    this.previewElement.style.left = `${left}px`;
    this.previewElement.style.top = `${top}px`;
  }

  private getPreviewBounds(previewWindow: Window): PreviewBounds {
    const viewportBounds = this.getViewportBounds(previewWindow);
    const previewRoot = this.previewElement?.parentElement;
    if (!previewRoot) {
      return viewportBounds;
    }

    const rootRect = previewRoot.getBoundingClientRect();
    if (rootRect.width <= PREVIEW_VIEWPORT_MARGIN * 2) {
      return viewportBounds;
    }

    const boundedRoot = {
      left: Math.max(
        viewportBounds.left,
        rootRect.left + PREVIEW_VIEWPORT_MARGIN
      ),
      right: Math.min(
        viewportBounds.right,
        rootRect.right - PREVIEW_VIEWPORT_MARGIN
      ),
      top: viewportBounds.top,
      bottom: viewportBounds.bottom,
    };

    if (boundedRoot.right <= boundedRoot.left) {
      return viewportBounds;
    }

    return boundedRoot;
  }

  private getViewportBounds(previewWindow: Window): PreviewBounds {
    const visualViewport = previewWindow.visualViewport;
    if (!visualViewport) {
      return {
        left: PREVIEW_VIEWPORT_MARGIN,
        right: previewWindow.innerWidth - PREVIEW_VIEWPORT_MARGIN,
        top: PREVIEW_VIEWPORT_MARGIN,
        bottom: previewWindow.innerHeight - PREVIEW_VIEWPORT_MARGIN,
      };
    }

    return {
      left: visualViewport.offsetLeft + PREVIEW_VIEWPORT_MARGIN,
      right:
        visualViewport.offsetLeft +
        visualViewport.width -
        PREVIEW_VIEWPORT_MARGIN,
      top: visualViewport.offsetTop + PREVIEW_VIEWPORT_MARGIN,
      bottom:
        visualViewport.offsetTop +
        visualViewport.height -
        PREVIEW_VIEWPORT_MARGIN,
    };
  }

  private startTrackingPosition() {
    const previewWindow = this.dom.ownerDocument.defaultView;
    if (!previewWindow || this.isTrackingPosition) {
      return;
    }

    previewWindow.addEventListener("resize", this.schedulePreviewPosition);
    previewWindow.addEventListener(
      "scroll",
      this.schedulePreviewPosition,
      true
    );
    previewWindow.visualViewport?.addEventListener(
      "resize",
      this.schedulePreviewPosition
    );
    previewWindow.visualViewport?.addEventListener(
      "scroll",
      this.schedulePreviewPosition
    );
    this.isTrackingPosition = true;
  }

  private stopTrackingPosition() {
    const previewWindow = this.dom.ownerDocument.defaultView;
    if (!previewWindow || !this.isTrackingPosition) {
      return;
    }

    previewWindow.removeEventListener("resize", this.schedulePreviewPosition);
    previewWindow.removeEventListener(
      "scroll",
      this.schedulePreviewPosition,
      true
    );
    previewWindow.visualViewport?.removeEventListener(
      "resize",
      this.schedulePreviewPosition
    );
    previewWindow.visualViewport?.removeEventListener(
      "scroll",
      this.schedulePreviewPosition
    );
    this.isTrackingPosition = false;
  }

  private cancelPreviewPosition() {
    const previewWindow = this.dom.ownerDocument.defaultView;
    if (!previewWindow || this.positionFrame === undefined) {
      return;
    }

    previewWindow.cancelAnimationFrame(this.positionFrame);
    this.positionFrame = undefined;
  }

  private cancelBlockHeightSync() {
    const previewWindow = this.dom.ownerDocument.defaultView;
    if (!previewWindow || this.blockHeightFrame === undefined) {
      return;
    }

    previewWindow.cancelAnimationFrame(this.blockHeightFrame);
    this.blockHeightFrame = undefined;
  }

  private destroyPreview() {
    this.stopTrackingPosition();
    this.cancelPreviewPosition();
    this.previewElement?.remove();
    this.previewElement = undefined;
  }
}

function clamp(value: number, min: number, max: number) {
  if (min > max) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

export function createMathView(displayMode: boolean): NodeViewConstructor {
  return (node, view, getPos) => {
    if (!isNode) {
      // dynamically load katex styles and fonts
      void import("katex/dist/katex.min.css");
    }

    const pluginState = MATH_PLUGIN_KEY.getState(view.state);
    if (!pluginState) {
      throw new Error("no math plugin!");
    }
    const nodeViews = pluginState.activeNodeViews;

    // set up NodeView
    const nodeView = new PreviewMathView(
      node,
      view,
      getPos as () => number,
      {
        katexOptions: {
          displayMode,
          output: "html",
          macros: pluginState.macros,
        },
      },
      MATH_PLUGIN_KEY,
      () => {
        nodeViews.splice(nodeViews.indexOf(nodeView));
      }
    );

    nodeViews.push(nodeView);
    if (displayMode) {
      attachBlockViewHalo(nodeView.dom, {
        nodeName: "math_block",
        role: "math",
      });
    }
    return nodeView;
  };
}

const mathPluginSpec: PluginSpec<IMathPluginState> = {
  key: MATH_PLUGIN_KEY,
  state: {
    init() {
      return {
        macros: {},
        activeNodeViews: [],
        prevCursorPos: 0,
      };
    },
    apply(tr, value, oldState) {
      return {
        activeNodeViews: value.activeNodeViews,
        macros: value.macros,
        prevCursorPos: oldState.selection.from,
      };
    },
  },
  props: {
    nodeViews: {
      math_inline: createMathView(false),
      math_block: createMathView(true),
    },
  },
};

export default new Plugin(mathPluginSpec);
