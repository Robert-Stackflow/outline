import { isHexColor } from "class-validator";
import type { Node as ProsemirrorNode, NodeSpec } from "prosemirror-model";

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

function getHexAttr(value: unknown): string | null {
  return typeof value === "string" && isHexColor(value) ? value : null;
}
