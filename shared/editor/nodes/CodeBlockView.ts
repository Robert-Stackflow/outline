import type { Node as ProsemirrorNode } from "prosemirror-model";
import type { NodeView } from "prosemirror-view";
import { attachBlockViewHalo } from "../lib/blockView";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";

/**
 * NodeView for code blocks with a real block envelope and line number gutter.
 */
export class CodeBlockView implements NodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;

  private readonly nodeName: string;
  private readonly showLineNumbers: boolean;
  private readonly gutter: HTMLElement;

  constructor(node: ProsemirrorNode, showLineNumbers: boolean) {
    this.nodeName = node.type.name;
    this.showLineNumbers = showLineNumbers;

    this.dom = document.createElement("div");
    this.dom.classList.add(EditorStyleHelper.codeBlock);
    attachBlockViewHalo(this.dom, {
      nodeName: node.type.name,
      role: "code",
    });

    const content = document.createElement("div");
    content.classList.add(EditorStyleHelper.blockContent, "block-code-content");

    const pre = document.createElement("pre");
    this.gutter = document.createElement("span");
    this.gutter.className = "block-code-gutter";
    this.gutter.contentEditable = "false";
    this.gutter.setAttribute("aria-hidden", "true");

    this.contentDOM = document.createElement("code");
    this.contentDOM.spellcheck = false;

    pre.appendChild(this.gutter);
    pre.appendChild(this.contentDOM);
    content.appendChild(pre);

    const fade = document.createElement("span");
    fade.className = "block-code-fade";
    fade.contentEditable = "false";
    fade.setAttribute("aria-hidden", "true");

    this.dom.insertBefore(
      content,
      this.dom.querySelector(`.${EditorStyleHelper.blockHalo}`)
    );
    this.dom.insertBefore(
      fade,
      this.dom.querySelector(`.${EditorStyleHelper.blockHalo}`)
    );

    this.updateCodeBlock(node);
  }

  update(node: ProsemirrorNode) {
    if (node.type.name !== this.nodeName) {
      return false;
    }

    this.updateCodeBlock(node);
    return true;
  }

  ignoreMutation(mutation: MutationRecord) {
    return !this.contentDOM.contains(mutation.target);
  }

  private updateCodeBlock(node: ProsemirrorNode) {
    const shouldShowLineNumbers = this.showLineNumbers && !node.attrs.wrap;

    this.dom.dataset.language = node.attrs.language;
    this.dom.classList.toggle("with-line-wrap", !!node.attrs.wrap);
    this.dom.classList.toggle("with-line-numbers", shouldShowLineNumbers);

    if (!shouldShowLineNumbers) {
      this.gutter.textContent = "";
      this.dom.style.removeProperty("--line-number-gutter-width");
      return;
    }

    const lineCount = (node.textContent.match(/\n/g) ?? []).length + 1;
    const gutterWidth = String(lineCount).length;
    const lineNumberText = Array.from({ length: lineCount }, (_, index) =>
      String(index + 1).padStart(gutterWidth, " ")
    ).join("\n");

    this.gutter.textContent = lineNumberText;
    this.dom.style.setProperty(
      "--line-number-gutter-width",
      String(gutterWidth)
    );
  }
}
