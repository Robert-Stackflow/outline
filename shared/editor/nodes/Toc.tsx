import { InputRule } from "prosemirror-inputrules";
import type {
  NodeSpec,
  NodeType,
  Node as ProsemirrorNode,
} from "prosemirror-model";
import type { Command } from "prosemirror-state";
import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { ProsemirrorHelper } from "../../utils/ProsemirrorHelper";
import TableOfContents from "../components/TableOfContents";
import type { MarkdownSerializerState } from "../lib/markdown/serializer";
import tocRule from "../rules/toc";
import type { ComponentProps } from "../types";
import ReactNode from "./ReactNode";

export default class Toc extends ReactNode {
  get name() {
    return "toc";
  }

  get rulePlugins() {
    return [tocRule];
  }

  get schema(): NodeSpec {
    return {
      group: "block",
      atom: true,
      selectable: true,
      draggable: true,
      parseDOM: [{ tag: "div.toc" }],
      toDOM: () => [
        "div",
        { class: "toc", contenteditable: "false" },
      ],
    };
  }

  component = (props: ComponentProps) => <TableOfContents {...props} />;

  commands({ type }: { type: NodeType }) {
    return (): Command =>
      (state, dispatch) => {
        dispatch?.(
          state.tr.replaceSelectionWith(type.create()).scrollIntoView()
        );
        return true;
      };
  }

  inputRules({ type }: { type: NodeType }) {
    return [
      new InputRule(
        /^(\[toc\]|\[\[_?toc_?\]\])$/i,
        (state, _match, start, end) => {
          const { tr } = state;
          tr.replaceWith(start - 1, end, type.create());
          return tr;
        }
      ),
    ];
  }

  get plugins() {
    const nodeName = this.name;

    // Compute a signature of the document's headings. When this changes, the
    // node decoration below changes too, prompting Prosemirror to call the
    // nodeview's update() so the live table of contents re-renders.
    const getSignature = (doc: ProsemirrorNode) =>
      ProsemirrorHelper.getHeadings(doc)
        .map((heading) => `${heading.level}:${heading.id}`)
        .join("|");

    return [
      new Plugin({
        props: {
          decorations: (state) => {
            const signature = getSignature(state.doc);
            const decorations: Decoration[] = [];

            state.doc.descendants((node, pos) => {
              if (node.type.name === nodeName) {
                decorations.push(
                  Decoration.node(pos, pos + node.nodeSize, {
                    "data-headings": signature,
                  })
                );
              }
            });

            return decorations.length
              ? DecorationSet.create(state.doc, decorations)
              : null;
          },
        },
      }),
    ];
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.write("[TOC]");
    state.closeBlock(node);
  }

  parseMarkdown() {
    return {
      node: "toc",
    };
  }
}
