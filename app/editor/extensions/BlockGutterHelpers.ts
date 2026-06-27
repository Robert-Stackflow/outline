import type { Node as ProsemirrorNode, ResolvedPos } from "prosemirror-model";
import type { EditorState, Transaction } from "prosemirror-state";
import { NodeSelection, Selection, TextSelection } from "prosemirror-state";

const semanticContainerNodeNames = new Set([
  "blockquote",
  "container_notice",
  "container_toggle",
  "table",
]);
const wholeBlockContainerNodeNames = new Set(["container_toggle"]);
const absorbingBlockNodeNames = new Set(["list_item", "checkbox_item"]);
const structuralContainerNodeNames = new Set([
  "bullet_list",
  "ordered_list",
  "checkbox_list",
]);

/**
 * Ancestor metadata for a block gutter target.
 */
export interface BlockGutterAncestor {
  /** Document position before the ancestor node. */
  pos: number;
  /** Ancestor node. */
  node: ProsemirrorNode;
  /** Ancestor depth in the resolved document position. */
  depth: number;
}

/**
 * A single atomic block that should receive gutter controls.
 */
export interface BlockGutterTarget {
  /** Document position before the target node. */
  pos: number;
  /** The target node. */
  node: ProsemirrorNode;
  /** The target node depth in the resolved document position. */
  depth: number;
  /** Parent node position, when the parent is not the document. */
  parentPos?: number;
  /** Parent node, when the parent is not the document. */
  parentNode?: ProsemirrorNode;
  /** Ancestors from outermost to innermost, excluding the document and target. */
  ancestors: BlockGutterAncestor[];
}

/**
 * Resolves a document position to the innermost atomic block that should
 * receive gutter controls.
 *
 * @param state - the current editor state.
 * @param docPos - the document position from `posAtCoords`.
 * @returns the resolved block target, or null when no block is available.
 */
export function resolveBlockGutterTarget(
  state: EditorState,
  docPos: number
): BlockGutterTarget | null {
  const docSize = state.doc.content.size;
  const positions = Array.from(
    new Set([
      clampDocPosition(docPos, docSize),
      clampDocPosition(docPos - 1, docSize),
      clampDocPosition(docPos + 1, docSize),
    ])
  );
  let target: BlockGutterTarget | null = null;

  for (const position of positions) {
    target = deeperTarget(
      target,
      targetFromNodeAtPosition(state, position) ??
        targetFromResolvedPosition(state.doc.resolve(position))
    );
  }

  return target;
}

/**
 * Creates a selection that covers the target block's editable content. Leaf and
 * atom blocks use a node selection.
 *
 * @param state - the current editor state.
 * @param target - the block target to select.
 * @returns a selection suitable for block commands.
 */
export function selectionForBlockGutterTarget(
  state: EditorState,
  target: BlockGutterTarget
): Selection {
  if (target.node.isAtom || target.node.isLeaf || target.node.nodeSize <= 2) {
    return NodeSelection.create(state.doc, target.pos);
  }

  return TextSelection.between(
    state.doc.resolve(target.pos + 1),
    state.doc.resolve(target.pos + target.node.nodeSize - 1)
  );
}

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

function targetFromNodeAtPosition(
  state: EditorState,
  pos: number
): BlockGutterTarget | null {
  const node = state.doc.nodeAt(pos);
  if (!node?.isBlock) {
    return null;
  }

  const insidePos = clampDocPosition(
    pos + (node.isLeaf || node.isAtom ? 0 : 1),
    state.doc.content.size
  );
  const $inside = state.doc.resolve(insidePos);
  const preferredTarget = targetFromResolvedPosition($inside);
  if (preferredTarget) {
    return preferredTarget;
  }

  if (!isAtomicBlockNode(node)) {
    return null;
  }

  return targetAtKnownPosition($inside, pos, node);
}

function targetFromResolvedPosition($pos: ResolvedPos) {
  const wholeBlockContainerDepth = findDeepestMatchingDepth(
    $pos,
    wholeBlockContainerNodeNames
  );
  if (wholeBlockContainerDepth !== undefined) {
    return targetAtDepth($pos, wholeBlockContainerDepth);
  }

  const atomicContainerDepth = findDeepestMatchingDepth($pos, [
    ...semanticContainerNodeNames,
    ...absorbingBlockNodeNames,
  ]);
  if (atomicContainerDepth !== undefined) {
    return targetAtDepth($pos, atomicContainerDepth);
  }

  for (let depth = $pos.depth; depth >= 1; depth--) {
    if (isAtomicBlockNode($pos.node(depth))) {
      return targetAtDepth($pos, depth);
    }
  }

  return null;
}

function findDeepestMatchingDepth(
  $pos: ResolvedPos,
  nodeNames: Iterable<string>
) {
  const names = new Set(nodeNames);
  for (let depth = $pos.depth; depth >= 1; depth--) {
    if (names.has($pos.node(depth).type.name)) {
      return depth;
    }
  }
  return undefined;
}

function isAtomicBlockNode(node: ProsemirrorNode) {
  return node.isBlock && !structuralContainerNodeNames.has(node.type.name);
}

function targetAtDepth($pos: ResolvedPos, depth: number): BlockGutterTarget {
  return targetAtKnownPosition($pos, $pos.before(depth), $pos.node(depth));
}

function targetAtKnownPosition(
  $context: ResolvedPos,
  pos: number,
  node: ProsemirrorNode
): BlockGutterTarget {
  const depth = findNodeStartDepth($context, pos) ?? $context.depth + 1;
  const parentDepth = Math.max(0, depth - 1);
  const ancestors = ancestorsBeforeDepth($context, parentDepth);

  return {
    pos,
    node,
    depth,
    parentPos: parentDepth > 0 ? $context.before(parentDepth) : undefined,
    parentNode: parentDepth > 0 ? $context.node(parentDepth) : undefined,
    ancestors,
  };
}

function ancestorsBeforeDepth($pos: ResolvedPos, parentDepth: number) {
  const ancestors: BlockGutterAncestor[] = [];
  for (let depth = 1; depth <= parentDepth; depth++) {
    ancestors.push({
      pos: $pos.before(depth),
      node: $pos.node(depth),
      depth,
    });
  }
  return ancestors;
}

function findNodeStartDepth($pos: ResolvedPos, pos: number) {
  for (let depth = $pos.depth; depth >= 1; depth--) {
    if ($pos.before(depth) === pos) {
      return depth;
    }
  }
  return undefined;
}

function deeperTarget(
  current: BlockGutterTarget | null,
  next: BlockGutterTarget | null
) {
  if (!next) {
    return current;
  }
  if (!current) {
    return next;
  }
  return next.depth > current.depth ? next : current;
}

function createEmptySiblingNode(
  state: EditorState,
  target: BlockGutterTarget
): ProsemirrorNode | null | undefined {
  if (absorbingBlockNodeNames.has(target.node.type.name)) {
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

function clampDocPosition(pos: number, docSize: number) {
  return Math.max(0, Math.min(pos, docSize));
}
