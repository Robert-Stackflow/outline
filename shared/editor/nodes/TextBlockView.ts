import type { Node as ProsemirrorNode } from "prosemirror-model";
import type { NodeView } from "prosemirror-view";
import {
  createBlockViewElements,
  shouldIgnoreBlockViewMutation,
} from "../lib/blockView";

type TextBlockKind = "paragraph" | "heading";

/**
 * NodeView for plain text blocks that gives paragraphs and headings a real
 * block envelope without changing their persisted ProseMirror schema.
 */
export class TextBlockView implements NodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;

  private readonly kind: TextBlockKind;
  private readonly headingOffset: number;
  private contentTagName: string;

  constructor(
    node: ProsemirrorNode,
    kind: TextBlockKind,
    headingOffset: number = 0
  ) {
    this.kind = kind;
    this.headingOffset = headingOffset;
    this.contentTagName = contentTagNameForNode(node, kind, headingOffset);

    const elements = createBlockViewElements({
      nodeName: node.type.name,
      role: "text",
      contentTagName: this.contentTagName,
      contentClassNames: kind === "heading" ? ["heading-content"] : [],
      contentAttrs: {
        dir: "auto",
      },
    });

    this.dom = elements.dom;
    this.contentDOM = elements.contentDOM;
  }

  update(node: ProsemirrorNode) {
    if (node.type.name !== this.kind) {
      return false;
    }

    const nextContentTagName = contentTagNameForNode(
      node,
      this.kind,
      this.headingOffset
    );
    if (nextContentTagName !== this.contentTagName) {
      return false;
    }

    return true;
  }

  ignoreMutation(mutation: MutationRecord) {
    return shouldIgnoreBlockViewMutation(this.contentDOM, mutation);
  }
}

function contentTagNameForNode(
  node: ProsemirrorNode,
  kind: TextBlockKind,
  headingOffset: number
) {
  if (kind === "paragraph") {
    return "p";
  }

  const rawLevel = node.attrs.level;
  const level = typeof rawLevel === "number" ? rawLevel : 1;
  const renderedLevel = Math.max(1, Math.min(6, level + headingOffset));
  return `h${renderedLevel}`;
}
