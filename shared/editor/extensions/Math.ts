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

class PreviewMathView extends MathView {
  private previewElement?: HTMLElement;
  private positionFrame?: number;
  private isTrackingPosition = false;

  public destroy() {
    this.destroyPreview();
    super.destroy();
  }

  public selectNode() {
    super.selectNode();
    this.showPreview();
  }

  public deselectNode() {
    this.hidePreview();
    super.deselectNode();
  }

  public renderMath() {
    super.renderMath();
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
    const previewRect = this.previewElement.getBoundingClientRect();
    const left = clamp(
      anchorRect.left + anchorRect.width / 2,
      PREVIEW_VIEWPORT_MARGIN + previewRect.width / 2,
      previewWindow.innerWidth - PREVIEW_VIEWPORT_MARGIN - previewRect.width / 2
    );
    const canPlaceAbove =
      anchorRect.top - previewRect.height - PREVIEW_OFFSET >
      PREVIEW_VIEWPORT_MARGIN;
    const top = canPlaceAbove
      ? anchorRect.top - PREVIEW_OFFSET
      : Math.min(
          previewWindow.innerHeight - PREVIEW_VIEWPORT_MARGIN,
          anchorRect.bottom + PREVIEW_OFFSET
        );

    this.previewElement.classList.toggle("placement-below", !canPlaceAbove);
    this.previewElement.style.left = `${left}px`;
    this.previewElement.style.top = `${top}px`;
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

  private destroyPreview() {
    this.stopTrackingPosition();
    this.cancelPreviewPosition();
    this.previewElement?.remove();
    this.previewElement = undefined;
  }
}

function clamp(value: number, min: number, max: number) {
  if (min > max) {
    return value;
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
