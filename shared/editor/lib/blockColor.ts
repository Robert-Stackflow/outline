import { isHexColor } from "class-validator";
import type { Node as ProsemirrorNode, NodeSpec } from "prosemirror-model";
import type { JSONObject, ProsemirrorData } from "../../types";

export const blockBackgroundColorAttr = "blockBackgroundColor";
export const blockTextColorAttr = "blockTextColor";

export interface BlockColorAttrs {
  backgroundColor: string | null;
  textColor: string | null;
}

export const blockColorNodeAttrs: NonNullable<NodeSpec["attrs"]> = {
  [blockBackgroundColorAttr]: {
    default: null,
    validate: "string|null",
  },
  [blockTextColorAttr]: {
    default: null,
    validate: "string|null",
  },
};

/**
 * Returns the validated block color attributes for a ProseMirror node.
 *
 * @param node - the node to inspect.
 * @returns the block color attributes for the node.
 */
export function getBlockColorAttrs(node: ProsemirrorNode): BlockColorAttrs {
  return {
    backgroundColor: getHexAttr(node.attrs[blockBackgroundColorAttr]),
    textColor: getHexAttr(node.attrs[blockTextColorAttr]),
  };
}

/**
 * Returns whether a node has either block background or text color.
 *
 * @param node - the node to inspect.
 * @returns true when the node carries a block color attribute.
 */
export function hasBlockColorAttrs(node: ProsemirrorNode): boolean {
  const attrs = getBlockColorAttrs(node);
  return !!attrs.backgroundColor || !!attrs.textColor;
}

/**
 * Removes empty block color attrs from serialized ProseMirror JSON while
 * preserving non-empty block colors and all unrelated attrs.
 *
 * @param data - the ProseMirror JSON to normalize.
 * @returns the normalized ProseMirror JSON.
 */
export function normalizeBlockColorAttrs(
  data: ProsemirrorData
): ProsemirrorData {
  let changed = false;
  const nextContent = data.content?.map((child) => {
    const nextChild = normalizeBlockColorAttrs(child);
    if (nextChild !== child) {
      changed = true;
    }
    return nextChild;
  });
  const nextAttrs = data.attrs ? normalizeAttrs(data.attrs) : undefined;

  if (nextAttrs !== data.attrs) {
    changed = true;
  }

  if (!changed) {
    return data;
  }

  const next: ProsemirrorData = {
    ...data,
  };

  if (nextContent) {
    next.content = nextContent;
  }

  if (nextAttrs && Object.keys(nextAttrs).length > 0) {
    next.attrs = nextAttrs;
  } else {
    delete next.attrs;
  }

  return next;
}

function getHexAttr(value: unknown): string | null {
  return typeof value === "string" && isHexColor(value) ? value : null;
}

function normalizeAttrs(attrs: JSONObject): JSONObject {
  let changed = false;
  const next = { ...attrs };

  if (
    next[blockBackgroundColorAttr] === null ||
    next[blockBackgroundColorAttr] === undefined
  ) {
    delete next[blockBackgroundColorAttr];
    changed = true;
  }

  if (
    next[blockTextColorAttr] === null ||
    next[blockTextColorAttr] === undefined
  ) {
    delete next[blockTextColorAttr];
    changed = true;
  }

  return changed ? next : attrs;
}
