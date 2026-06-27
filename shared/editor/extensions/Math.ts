import { MathView } from "@benrbray/prosemirror-math";
import { isNode } from "@shared/utils/browser";
import type { PluginSpec } from "prosemirror-state";
import { Plugin, PluginKey } from "prosemirror-state";
import type { NodeViewConstructor } from "prosemirror-view";

export interface IMathPluginState {
  macros: { [cmd: string]: string };
  activeNodeViews: MathView[];
  prevCursorPos: number;
}

const MATH_PLUGIN_KEY = new PluginKey<IMathPluginState>("prosemirror-math");
const MIN_BLOCK_SCALE = 0.68;
const BLOCK_MATH_SELECTOR = "math-block.math-node, math-display.math-node";

function fitBlockMath(root: HTMLElement) {
  const nodes = [
    ...(root.matches(BLOCK_MATH_SELECTOR) ? [root] : []),
    ...Array.from(root.querySelectorAll<HTMLElement>(BLOCK_MATH_SELECTOR)),
  ];

  nodes.forEach((node) => {
    const render = node.querySelector<HTMLElement>(".math-render");
    const katex = render?.querySelector<HTMLElement>(".katex");

    if (!render || !katex) {
      return;
    }

    const availableWidth = render.clientWidth || node.clientWidth;
    const renderedWidth = katex.scrollWidth;
    if (!availableWidth || renderedWidth <= availableWidth) {
      node.classList.remove("math-fit");
      setStyleIfChanged(render, "height", "");
      setStyleIfChanged(katex, "display", "");
      setStyleIfChanged(katex, "transform", "");
      setStyleIfChanged(katex, "transformOrigin", "");
      return;
    }

    const scale = Math.max(MIN_BLOCK_SCALE, availableWidth / renderedWidth);
    setStyleIfChanged(katex, "display", "inline-block");
    setStyleIfChanged(katex, "transform", `scale(${scale})`);
    setStyleIfChanged(katex, "transformOrigin", "center top");
    setStyleIfChanged(
      render,
      "height",
      `${Math.ceil(katex.getBoundingClientRect().height)}px`
    );
    node.classList.add("math-fit");
  });
}

type MathStyleProperty = "height" | "display" | "transform" | "transformOrigin";

function setStyleIfChanged(
  element: HTMLElement,
  property: MathStyleProperty,
  value: string
) {
  if (element.style[property] === value) {
    return;
  }

  element.style[property] = value;
}

function scheduleFitBlockMath(root: HTMLElement): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  let frame: number | undefined;
  const timeouts = new Set<number>();

  const fit = () => fitBlockMath(root);
  const schedule = (delay: number) => {
    const timeout = window.setTimeout(() => {
      timeouts.delete(timeout);
      fit();
    }, delay);
    timeouts.add(timeout);
  };

  frame = window.requestAnimationFrame(() => {
    frame = undefined;
    fit();
    // KaTeX can finish after the ProseMirror view update, especially on first
    // paint. A couple of delayed passes keep long formulas from keeping their
    // initial horizontal scrollbar.
    schedule(80);
    schedule(240);
  });

  return () => {
    if (frame !== undefined) {
      window.cancelAnimationFrame(frame);
    }
    timeouts.forEach((timeout) => window.clearTimeout(timeout));
    timeouts.clear();
  };
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
    const nodeView = new MathView(
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
      const cleanup = scheduleFitBlockMath(nodeView.dom);
      const destroy = nodeView.destroy?.bind(nodeView);
      nodeView.destroy = () => {
        cleanup();
        destroy?.();
      };
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
