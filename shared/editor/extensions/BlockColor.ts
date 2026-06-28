import { isHexColor } from "class-validator";
import { rgba } from "polished";
import type {
  Mark as ProsemirrorMark,
  Node as ProsemirrorNode,
} from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import Extension from "../lib/Extension";
import { isBlockModelActionNode } from "../lib/blockModel";
import type { BlockColorAttrs } from "../lib/blockColor";
import { getBlockColorAttrs, hasBlockColorAttrs } from "../lib/blockColor";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";

const blockColorOpacity = 0.16;
const blockColorPluginKey = new PluginKey<BlockColorPluginState>("block-color");

interface BlockColorPluginState {
  decorations: DecorationSet;
}

interface ChangedRange {
  from: number;
  to: number;
}

/**
 * Renders whole-block background and text colors saved on block nodes.
 */
export class BlockColor extends Extension {
  get name() {
    return "block-color";
  }

  get allowInReadOnly() {
    return true;
  }

  get plugins() {
    return [
      new Plugin<BlockColorPluginState>({
        key: blockColorPluginKey,
        state: {
          init: (_, state) => ({
            decorations: createBlockColorDecorations(state.doc),
          }),
          apply: (tr, value, _oldState, _newState) => {
            if (!tr.mapping.maps.length) {
              return value;
            }

            const decorations = value.decorations.map(tr.mapping, tr.doc);
            if (!tr.docChanged) {
              return { decorations };
            }

            const changedRange = changedRangeForTransaction(tr.before, tr.doc);
            if (!changedRange) {
              return { decorations };
            }

            return {
              decorations: refreshBlockColorDecorations(
                tr.doc,
                decorations,
                changedRange
              ),
            };
          },
        },
        props: {
          decorations: (state) =>
            blockColorPluginKey.getState(state)?.decorations,
        },
      }),
    ];
  }
}

function createBlockColorDecorations(doc: ProsemirrorNode): DecorationSet {
  const decorations: Decoration[] = [];

  doc.descendants((node, pos) => {
    if (!isBlockModelActionNode(node)) {
      return true;
    }

    const attrs = getNodeOrLegacyBlockColorAttrs(node);
    if (!attrs.backgroundColor && !attrs.textColor) {
      return true;
    }

    decorations.push(
      Decoration.node(pos, pos + node.nodeSize, {
        class: EditorStyleHelper.blockColor,
        style: blockColorStyle(attrs),
      })
    );

    return true;
  });

  return DecorationSet.create(doc, decorations);
}

function refreshBlockColorDecorations(
  doc: ProsemirrorNode,
  decorations: DecorationSet,
  changedRange: ChangedRange
): DecorationSet {
  const staleDecorations = decorations.find(changedRange.from, changedRange.to);
  const nextDecorations = staleDecorations.length
    ? decorations.remove(staleDecorations)
    : decorations;
  const refreshedDecorations = createBlockColorDecorationsBetween(
    doc,
    changedRange.from,
    changedRange.to
  );

  return refreshedDecorations.length
    ? nextDecorations.add(doc, refreshedDecorations)
    : nextDecorations;
}

function createBlockColorDecorationsBetween(
  doc: ProsemirrorNode,
  from: number,
  to: number
): Decoration[] {
  const decorations: Decoration[] = [];

  doc.nodesBetween(from, to, (node, pos) => {
    if (!isBlockModelActionNode(node)) {
      return true;
    }

    const attrs = getNodeOrLegacyBlockColorAttrs(node);
    if (!attrs.backgroundColor && !attrs.textColor) {
      return true;
    }

    decorations.push(
      Decoration.node(pos, pos + node.nodeSize, {
        class: EditorStyleHelper.blockColor,
        style: blockColorStyle(attrs),
      })
    );

    return true;
  });

  return decorations;
}

function changedRangeForTransaction(
  before: ProsemirrorNode,
  doc: ProsemirrorNode
): ChangedRange | null {
  const start = before.content.findDiffStart(doc.content);
  if (start === null) {
    return null;
  }

  const end = before.content.findDiffEnd(doc.content);
  const docSize = doc.content.size;
  const from = Math.max(0, Math.min(start - 1, docSize));
  const to = Math.max(from, Math.min((end ? end.b : start) + 1, docSize));

  return {
    from,
    to,
  };
}

function getNodeOrLegacyBlockColorAttrs(
  node: ProsemirrorNode
): BlockColorAttrs {
  if (hasBlockColorAttrs(node)) {
    return getBlockColorAttrs(node);
  }

  return getLegacyBlockColorAttrs(node);
}

function getLegacyBlockColorAttrs(node: ProsemirrorNode): BlockColorAttrs {
  let attrs: BlockColorAttrs | null = null;
  let hasText = false;
  let matches = true;

  node.descendants((child) => {
    if (!matches) {
      return false;
    }
    if (!child.isText) {
      return true;
    }

    hasText = true;
    const mark = child.marks.find(isLegacyBlockHighlight);
    if (!mark) {
      matches = false;
      return false;
    }

    const nextAttrs = {
      backgroundColor: getHexAttr(mark.attrs.color),
      textColor: getHexAttr(mark.attrs.textColor),
    };

    if (!attrs) {
      attrs = nextAttrs;
      return true;
    }

    if (
      attrs.backgroundColor !== nextAttrs.backgroundColor ||
      attrs.textColor !== nextAttrs.textColor
    ) {
      matches = false;
      return false;
    }

    return true;
  });

  return matches && hasText
    ? (attrs ?? { backgroundColor: null, textColor: null })
    : { backgroundColor: null, textColor: null };
}

function isLegacyBlockHighlight(mark: ProsemirrorMark): boolean {
  return mark.type.name === "highlight" && mark.attrs.scope === "block";
}

function getHexAttr(value: unknown): string | null {
  return typeof value === "string" && isHexColor(value) ? value : null;
}

function blockColorStyle(attrs: BlockColorAttrs) {
  return [
    attrs.backgroundColor
      ? `--block-color-background: ${rgba(
          attrs.backgroundColor,
          blockColorOpacity
        )};`
      : "",
    attrs.textColor ? `color: ${attrs.textColor};` : "",
  ]
    .filter(Boolean)
    .join(" ");
}
