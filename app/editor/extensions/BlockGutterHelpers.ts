import type { Node as ProsemirrorNode } from "prosemirror-model";
import type { EditorState, Transaction } from "prosemirror-state";
import { Selection, TextSelection } from "prosemirror-state";
import {
  isBlockModelListItem,
  resolveBlockModelTarget,
  selectionForBlockModelTarget,
  type BlockModelTarget,
} from "@shared/editor/lib/blockModel";

export type BlockGutterTarget = BlockModelTarget;

/**
 * Resolves a document position to the single block that should receive gutter
 * controls.
 *
 * @param state - the current editor state.
 * @param docPos - the document position from posAtCoords.
 * @returns the resolved block target, or null when no block is available.
 */
export const resolveBlockGutterTarget = resolveBlockModelTarget;

/**
 * Creates a selection that lets existing editor commands operate on a block
 * target.
 *
 * @param state - the current editor state.
 * @param target - the block target to select.
 * @returns a selection suitable for block commands.
 */
export const selectionForBlockGutterTarget = selectionForBlockModelTarget;

/**
 * Creates a transaction that inserts an empty block below the target.
 *
 * @param state - the current editor state.
 * @param target - the block target to insert below.
 * @returns the insertion transaction, or null when no valid empty node exists.
 */
export function createBlockBelowTransaction(
  state: EditorState,
  target: BlockGutterTarget
): Transaction | null {
  const insertedNode = createEmptySiblingNode(state, target);
  if (!insertedNode) {
    return null;
  }

  const insertPos = target.pos + target.node.nodeSize;
  if (!canInsertNode(state.doc, insertPos, insertedNode)) {
    return null;
  }

  const tr = state.tr.insert(insertPos, insertedNode);
  return tr
    .setSelection(selectionInsideInsertedNode(tr.doc, insertPos, insertedNode))
    .scrollIntoView();
}

function createEmptySiblingNode(
  state: EditorState,
  target: BlockGutterTarget
): ProsemirrorNode | null | undefined {
  if (isBlockModelListItem(target.node)) {
    const attrs =
      target.node.type.name === "checkbox_item"
        ? { ...target.node.attrs, checked: false }
        : target.node.attrs;

    return target.node.type.createAndFill(attrs);
  }

  return state.schema.nodes.paragraph.createAndFill();
}

function canInsertNode(
  doc: ProsemirrorNode,
  pos: number,
  node: ProsemirrorNode
) {
  const $pos = doc.resolve(pos);
  return $pos.parent.canReplaceWith($pos.index(), $pos.index(), node.type);
}

function selectionInsideInsertedNode(
  doc: ProsemirrorNode,
  pos: number,
  node: ProsemirrorNode
): Selection {
  if (node.isTextblock) {
    return TextSelection.near(doc.resolve(pos + 1));
  }

  let textblockPos: number | undefined;
  node.descendants((child, childPos) => {
    if (textblockPos === undefined && child.isTextblock) {
      textblockPos = pos + 1 + childPos;
      return false;
    }
    return textblockPos === undefined;
  });

  if (textblockPos !== undefined) {
    return TextSelection.near(doc.resolve(textblockPos + 1));
  }

  return Selection.near(doc.resolve(pos + node.nodeSize));
}
