import type { Node as ProsemirrorNode } from "prosemirror-model";
import type { NodeView } from "prosemirror-view";
import {
  createBlockViewElements,
  shouldIgnoreBlockViewMutation,
} from "../lib/blockView";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";

/**
 * NodeView for quotes with a real DOM quote bar inside the block envelope.
 */
export class BlockquoteView implements NodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;

  constructor(node: ProsemirrorNode) {
    const elements = createBlockViewElements({
      nodeName: node.type.name,
      role: "quote",
      domTagName: "blockquote",
      chrome: true,
      indicatorClassNames: [EditorStyleHelper.blockQuoteBar],
    });

    this.dom = elements.dom;
    this.contentDOM = elements.contentDOM;
  }

  update(node: ProsemirrorNode) {
    return node.type.name === "blockquote";
  }

  ignoreMutation(mutation: MutationRecord) {
    return shouldIgnoreBlockViewMutation(this.contentDOM, mutation);
  }
}
