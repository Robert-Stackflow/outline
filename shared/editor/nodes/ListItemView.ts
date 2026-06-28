import type { Node as ProsemirrorNode } from "prosemirror-model";
import type { NodeView } from "prosemirror-view";
import {
  createBlockViewElements,
  shouldIgnoreBlockViewMutation,
} from "../lib/blockView";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";

const bulletMarkers = ["•", "◦", "▪"];

/**
 * NodeView for list items with a real DOM marker inside the block envelope.
 */
export class ListItemView implements NodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;

  constructor(node: ProsemirrorNode) {
    const elements = createBlockViewElements({
      nodeName: node.type.name,
      role: "list-item",
      domTagName: "li",
      chrome: true,
      indicatorClassNames: [EditorStyleHelper.blockListMarker],
    });

    this.dom = elements.dom;
    this.contentDOM = elements.contentDOM;
    queueListMarkerRefresh(this.dom);
  }

  update(node: ProsemirrorNode) {
    if (node.type.name !== "list_item") {
      return false;
    }

    queueListMarkerRefresh(this.dom);
    return true;
  }

  ignoreMutation(mutation: MutationRecord) {
    return shouldIgnoreBlockViewMutation(this.contentDOM, mutation);
  }
}

/**
 * Refreshes all real-DOM list markers below the given root.
 *
 * @param root - editor root or a list item subtree.
 */
export function refreshListItemMarkers(root: HTMLElement) {
  const items = root.querySelectorAll(
    `li.${EditorStyleHelper.blockView}[data-block-node="list_item"]`
  );

  for (const item of items) {
    if (!(item instanceof HTMLElement)) {
      continue;
    }

    const indicator = item.querySelector(
      `:scope > .${EditorStyleHelper.blockChrome} > .${EditorStyleHelper.blockIndicator}.${EditorStyleHelper.blockListMarker}`
    );
    if (!(indicator instanceof HTMLElement)) {
      continue;
    }

    const depth = listDepth(item);
    const kind = markerKindForItem(item);
    item.dataset.listKind = kind;
    item.dataset.listDepth = depth.toString();
    indicator.dataset.listKind = kind;
    indicator.dataset.listDepth = depth.toString();
    indicator.textContent = markerTextForItem(item);
  }
}

/**
 * Queues a marker refresh after ProseMirror has attached NodeViews to the DOM.
 *
 * @param root - editor root or a list item subtree.
 */
export function queueListMarkerRefresh(root: HTMLElement) {
  if (
    typeof window === "undefined" ||
    typeof window.requestAnimationFrame !== "function"
  ) {
    refreshListItemMarkers(root);
    return;
  }

  window.requestAnimationFrame(() => refreshListItemMarkers(root));
}

function markerTextForItem(item: HTMLElement) {
  const list = item.parentElement;
  if (list instanceof HTMLOListElement) {
    return `${formatOrderedMarker(
      list.start + indexWithinList(item),
      orderedStyleForList(list)
    )}.`;
  }

  return bulletMarkers[listDepth(item) % bulletMarkers.length];
}

function markerKindForItem(item: HTMLElement): "bullet" | "ordered" {
  return item.parentElement instanceof HTMLOListElement ? "ordered" : "bullet";
}

function indexWithinList(item: HTMLElement) {
  const list = item.parentElement;
  if (!list) {
    return 0;
  }

  let index = 0;
  for (const child of list.children) {
    if (child === item) {
      return index;
    }
    if (
      child instanceof HTMLElement &&
      child.dataset.blockNode === "list_item"
    ) {
      index++;
    }
  }

  return index;
}

function listDepth(item: HTMLElement) {
  let depth = 0;
  let element = item.parentElement;

  while (element) {
    if (
      element instanceof HTMLUListElement ||
      element instanceof HTMLOListElement
    ) {
      depth++;
    }
    element = element.parentElement;
  }

  return Math.max(0, depth - 1);
}

function formatOrderedMarker(value: number, style: string) {
  if (style === "lower-alpha") {
    return formatAlpha(value).toLowerCase();
  }
  if (style === "upper-alpha") {
    return formatAlpha(value).toUpperCase();
  }
  if (style === "lower-roman") {
    return formatRoman(value).toLowerCase();
  }
  if (style === "upper-roman") {
    return formatRoman(value).toUpperCase();
  }

  return value.toString();
}

function orderedStyleForList(list: HTMLOListElement) {
  if (list.style.listStyleType) {
    return list.style.listStyleType;
  }

  const styles = ["number", "lower-alpha", "lower-roman"];
  return styles[listDepthForList(list) % styles.length];
}

function listDepthForList(list: HTMLElement) {
  let depth = 0;
  let element = list.parentElement;

  while (element) {
    if (
      element instanceof HTMLUListElement ||
      element instanceof HTMLOListElement
    ) {
      depth++;
    }
    element = element.parentElement;
  }

  return depth;
}

function formatRoman(value: number) {
  const romanPairs: Array<{ roman: string; decimal: number }> = [
    { roman: "M", decimal: 1000 },
    { roman: "CM", decimal: 900 },
    { roman: "D", decimal: 500 },
    { roman: "CD", decimal: 400 },
    { roman: "C", decimal: 100 },
    { roman: "XC", decimal: 90 },
    { roman: "L", decimal: 50 },
    { roman: "XL", decimal: 40 },
    { roman: "X", decimal: 10 },
    { roman: "IX", decimal: 9 },
    { roman: "V", decimal: 5 },
    { roman: "IV", decimal: 4 },
    { roman: "I", decimal: 1 },
  ];
  let current = Math.max(1, value);
  let result = "";

  for (const { roman, decimal } of romanPairs) {
    while (current >= decimal) {
      result += roman;
      current -= decimal;
    }
  }

  return result;
}

function formatAlpha(value: number) {
  const alphabetSize = 26;
  let current = Math.max(1, value);
  let result = "";

  while (current > 0) {
    const remainder = (current - 1) % alphabetSize;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / alphabetSize);
  }

  return result;
}
