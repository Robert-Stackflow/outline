import type { Node as ProsemirrorNode } from "prosemirror-model";
import type { NodeView } from "prosemirror-view";
import { attachBlockViewHalo } from "../lib/blockView";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";

/**
 * NodeView for horizontal rules with a real line element inside a block halo.
 */
export class HorizontalRuleView implements NodeView {
  dom: HTMLElement;

  constructor(node: ProsemirrorNode) {
    this.dom = document.createElement("div");
    this.dom.classList.add("block-hr");
    attachBlockViewHalo(this.dom, {
      nodeName: node.type.name,
      role: "hr",
    });

    const content = document.createElement("div");
    content.className = EditorStyleHelper.blockContent;
    content.contentEditable = "false";

    const line = document.createElement("span");
    line.className = "block-hr-line";
    line.setAttribute("aria-hidden", "true");

    content.appendChild(line);
    this.dom.insertBefore(
      content,
      this.dom.querySelector(`.${EditorStyleHelper.blockHalo}`)
    );

    this.updateMarkup(node);
  }

  update(node: ProsemirrorNode) {
    if (node.type.name !== "hr") {
      return false;
    }

    this.updateMarkup(node);
    return true;
  }

  ignoreMutation() {
    return true;
  }

  private updateMarkup(node: ProsemirrorNode) {
    this.dom.classList.toggle("page-break", node.attrs.markup === "***");
  }
}
