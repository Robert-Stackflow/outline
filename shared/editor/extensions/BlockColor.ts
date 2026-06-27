import { isHexColor } from "class-validator";
import { rgba } from "polished";
import type {
  Mark as ProsemirrorMark,
  Node as ProsemirrorNode,
} from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import Extension from "../lib/Extension";
import type { BlockColorAttrs } from "../lib/blockColor";
import { getBlockColorAttrs, hasBlockColorAttrs } from "../lib/blockColor";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";

const blockColorOpacity = 0.16;
const blockColorPluginKey = new PluginKey<DecorationSet>("block-color");

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
      new Plugin<DecorationSet>({
        key: blockColorPluginKey,
        state: {
          init: (_, state) => createBlockColorDecorations(state.doc),
          apply: (tr, value, _oldState, newState) => {
            if (tr.docChanged) {
              return createBlockColorDecorations(newState.doc);
            }

            if (!tr.mapping.maps.length) {
              return value;
            }

            return value.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations: (state) => blockColorPluginKey.getState(state),
        },
      }),
    ];
  }
}

function createBlockColorDecorations(doc: ProsemirrorNode): DecorationSet {
  const decorations: Decoration[] = [];

  doc.descendants((node, pos) => {
    if (!node.isBlock) {
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

    return false;
  });

  return DecorationSet.create(doc, decorations);
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
