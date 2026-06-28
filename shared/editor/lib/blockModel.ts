import type { Node as ProsemirrorNode, ResolvedPos } from "prosemirror-model";
import type { EditorState, Selection } from "prosemirror-state";
import { NodeSelection, TextSelection } from "prosemirror-state";

const semanticContainerNodeNames = new Set(["blockquote", "container_notice"]);
const toggleContainerNodeName = "container_toggle";
const opaqueContainerNodeNames = new Set(["table"]);
const absorbingBlockNodeNames = new Set(["list_item", "checkbox_item"]);
const structuralContainerNodeNames = new Set([
  "bullet_list",
  "ordered_list",
  "checkbox_list",
]);
const mediaNodeNames = new Set(["attachment", "embed", "image", "video"]);

export type BlockModelRole =
  | "atom"
  | "container"
  | "listItem"
  | "media"
  | "table"
  | "taskItem"
  | "text";

export type BlockModelSelectionMode = "content" | "node";

/**
 * Ancestor metadata for a resolved editor block.
 */
export interface BlockModelAncestor {
  /** Document position before the ancestor node. */
  pos: number;
  /** Ancestor node. */
  node: ProsemirrorNode;
  /** Ancestor depth in the resolved document position. */
  depth: number;
}

/**
 * A single user-facing editor block.
 */
export interface BlockModelTarget {
  /** Document position before the target node. */
  pos: number;
  /** The node that receives commands and persisted block attributes. */
  node: ProsemirrorNode;
  /** The target node depth in the resolved document position. */
  depth: number;
  /** Parent node position, when the parent is not the document. */
  parentPos?: number;
  /** Parent node, when the parent is not the document. */
  parentNode?: ProsemirrorNode;
  /** Ancestors from outermost to innermost, excluding the document and target. */
  ancestors: BlockModelAncestor[];
  /** Semantic role used by block UI and styling. */
  role: BlockModelRole;
  /** Whether commands should usually select node chrome or editable content. */
  selectionMode: BlockModelSelectionMode;
}

/**
 * Resolves a document position to the single user-facing editor block at that
 * position.
 *
 * @param state - the current editor state.
 * @param docPos - the document position, usually from posAtCoords.
 * @returns the resolved block target, or null when no block is available.
 */
export function resolveBlockModelTarget(
  state: EditorState,
  docPos: number
): BlockModelTarget | null {
  const docSize = state.doc.content.size;
  const positions = Array.from(
    new Set([
      clampDocPosition(docPos, docSize),
      clampDocPosition(docPos - 1, docSize),
      clampDocPosition(docPos + 1, docSize),
    ])
  );
  let target: BlockModelTarget | null = null;

  for (const position of positions) {
    target = betterDepthTarget(
      target,
      targetFromNodeAtPosition(state, position) ??
        targetFromResolvedPosition(state.doc.resolve(position))
    );
  }

  return target;
}

/**
 * Creates a ProseMirror selection for commands that still require editor
 * selection to operate on a block target.
 *
 * @param state - the current editor state.
 * @param target - the block model target to select.
 * @returns a selection suitable for existing ProseMirror commands.
 */
export function selectionForBlockModelTarget(
  state: EditorState,
  target: BlockModelTarget
): Selection {
  if (target.selectionMode === "node") {
    return NodeSelection.create(state.doc, target.pos);
  }

  return TextSelection.between(
    state.doc.resolve(target.pos + 1),
    state.doc.resolve(target.pos + target.node.nodeSize - 1)
  );
}

/**
 * Returns whether a node can be a first-class block action target.
 *
 * @param node - the node to inspect.
 * @returns true when the node is a user-facing block target.
 */
export function isBlockModelActionNode(node: ProsemirrorNode): boolean {
  return node.isBlock && !structuralContainerNodeNames.has(node.type.name);
}

/**
 * Returns whether the node is a structural list container rather than an action
 * block.
 *
 * @param node - the node to inspect.
 * @returns true when the node should defer to child list items.
 */
export function isBlockModelStructuralContainer(
  node: ProsemirrorNode
): boolean {
  return structuralContainerNodeNames.has(node.type.name);
}

/**
 * Returns whether the node should create list-item siblings when inserting
 * below it.
 *
 * @param node - the node to inspect.
 * @returns true for list and checkbox item action blocks.
 */
export function isBlockModelListItem(node: ProsemirrorNode): boolean {
  return absorbingBlockNodeNames.has(node.type.name);
}

function targetFromNodeAtPosition(
  state: EditorState,
  pos: number
): BlockModelTarget | null {
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

  if (!isBlockModelActionNode(node)) {
    return null;
  }

  return targetAtKnownPosition($inside, pos, node);
}

function targetFromResolvedPosition(
  $pos: ResolvedPos
): BlockModelTarget | null {
  const opaqueDepth = findDeepestMatchingDepth($pos, opaqueContainerNodeNames);
  if (opaqueDepth !== undefined) {
    return targetAtDepth($pos, opaqueDepth);
  }

  const toggleDepth = findDeepestMatchingDepth($pos, [toggleContainerNodeName]);
  if (toggleDepth !== undefined && isInsideFirstChild($pos, toggleDepth)) {
    return targetAtDepth($pos, toggleDepth);
  }

  const absorbingDepth = findDeepestMatchingDepth(
    $pos,
    absorbingBlockNodeNames
  );
  if (absorbingDepth !== undefined) {
    return targetAtDepth($pos, absorbingDepth);
  }

  const semanticDepth = findDeepestMatchingDepth(
    $pos,
    semanticContainerNodeNames
  );
  if (semanticDepth !== undefined) {
    return targetAtDepth($pos, semanticDepth);
  }

  for (let depth = $pos.depth; depth >= 1; depth--) {
    if (isBlockModelActionNode($pos.node(depth))) {
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

function isInsideFirstChild($pos: ResolvedPos, depth: number) {
  if (depth >= $pos.depth) {
    return true;
  }
  return $pos.index(depth) === 0;
}

function targetAtDepth($pos: ResolvedPos, depth: number): BlockModelTarget {
  return targetAtKnownPosition($pos, $pos.before(depth), $pos.node(depth));
}

function targetAtKnownPosition(
  $context: ResolvedPos,
  pos: number,
  node: ProsemirrorNode
): BlockModelTarget {
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
    role: roleForNode(node),
    selectionMode: selectionModeForNode(node),
  };
}

function ancestorsBeforeDepth($pos: ResolvedPos, parentDepth: number) {
  const ancestors: BlockModelAncestor[] = [];
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

function betterDepthTarget(
  current: BlockModelTarget | null,
  next: BlockModelTarget | null
) {
  if (!next) {
    return current;
  }
  if (!current) {
    return next;
  }
  if (next.depth !== current.depth) {
    return next.depth > current.depth ? next : current;
  }
  return next.pos < current.pos ? next : current;
}

function roleForNode(node: ProsemirrorNode): BlockModelRole {
  if (node.type.name === "checkbox_item") {
    return "taskItem";
  }
  if (node.type.name === "list_item") {
    return "listItem";
  }
  if (node.type.name === "table") {
    return "table";
  }
  if (mediaNodeNames.has(node.type.name)) {
    return "media";
  }
  if (node.isAtom || node.isLeaf) {
    return "atom";
  }
  if (
    node.type.name === toggleContainerNodeName ||
    semanticContainerNodeNames.has(node.type.name)
  ) {
    return "container";
  }
  return "text";
}

function selectionModeForNode(node: ProsemirrorNode): BlockModelSelectionMode {
  if (
    node.isAtom ||
    node.isLeaf ||
    node.type.name === "table" ||
    mediaNodeNames.has(node.type.name)
  ) {
    return "node";
  }
  return "content";
}

function clampDocPosition(pos: number, docSize: number) {
  return Math.max(0, Math.min(pos, docSize));
}
