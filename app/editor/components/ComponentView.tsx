import type { Node as ProsemirrorNode } from "prosemirror-model";
import type { EditorView, Decoration } from "prosemirror-view";
import type { FunctionComponent } from "react";
import type Extension from "@shared/editor/lib/Extension";
import { createBlockViewElements } from "@shared/editor/lib/blockView";
import { EditorStyleHelper } from "@shared/editor/styles/EditorStyleHelper";
import type { ComponentProps } from "@shared/editor/types";
import type { Editor } from "~/editor";
import { NodeViewRenderer } from "./NodeViewRenderer";

type ComponentViewConstructor = {
  /** The editor instance. */
  editor: Editor;
  /** The extension the view belongs to. */
  extension: Extension;
  /** The node that the view is responsible for. */
  node: ProsemirrorNode;
  /** The editor view instance. */
  view: EditorView;
  /** A function that returns the current position of the node. */
  getPos: () => number;
  /** The decorations applied to the node. */
  decorations: Decoration[];
};

const blockLikeInlineNodeNames = new Set(["image"]);
const mediaComponentNodeNames = new Set([
  "attachment",
  "embed",
  "image",
  "video",
]);

export default class ComponentView {
  /** The React component to render. */
  component: FunctionComponent<ComponentProps>;
  /** The editor instance. */
  editor: Editor;
  /** The extension the view belongs to. */
  extension: Extension;
  /** The node that the view is responsible for. */
  node: ProsemirrorNode;
  /** The editor view instance. */
  view: EditorView;
  /** A function that returns the current position of the node. */
  getPos: () => number;
  /** The decorations applied to the node. */
  decorations: Decoration[];
  /** The renderer instance. */
  renderer: NodeViewRenderer<ComponentProps>;
  /** Whether the node is selected. */
  isSelected = false;
  /** The DOM element that the node is rendered into. */
  dom: HTMLElement | null;
  /** The DOM element used as the React render target. */
  renderElement: HTMLElement | null;
  /** The component class name for the node's DOM element. */
  componentClassName: string;
  /** The base class names that should never be removed as decorations change. */
  baseClassNames = new Set<string>();
  /** Decoration classes applied by this NodeView during the previous update. */
  appliedDecorationClassNames = new Set<string>();

  // See https://prosemirror.net/docs/ref/#view.NodeView
  constructor(
    component: FunctionComponent<ComponentProps>,
    {
      editor,
      extension,
      node,
      view,
      getPos,
      decorations,
    }: ComponentViewConstructor
  ) {
    this.component = component;
    this.editor = editor;
    this.extension = extension;
    this.getPos = getPos;
    this.decorations = decorations;
    this.node = node;
    this.view = view;
    this.componentClassName = `component-${node.type.name}`;

    if (shouldUseBlockComponentView(node)) {
      const elements = createBlockViewElements({
        nodeName: node.type.name,
        role: mediaComponentNodeNames.has(node.type.name) ? "media" : "atom",
        domTagName: node.type.spec.inline ? "span" : "div",
        contentTagName: node.type.spec.inline ? "span" : "div",
        classNames: ["block-view-component", this.componentClassName],
        contentClassNames: [
          "component-content",
          `${this.componentClassName}-content`,
        ],
      });

      this.dom = elements.dom;
      this.renderElement = elements.contentDOM;
    } else {
      this.dom = node.type.spec.inline
        ? document.createElement("span")
        : document.createElement("div");
      this.dom.classList.add(this.componentClassName);
      this.renderElement = this.dom;
    }

    this.dom.classList.forEach((className) => {
      this.baseClassNames.add(className);
    });

    if (shouldUseBlockComponentView(node)) {
      this.baseClassNames.add(EditorStyleHelper.blockView);
      this.baseClassNames.add(EditorStyleHelper.blockContent);
      this.baseClassNames.add(EditorStyleHelper.blockHalo);
    }

    if (!this.renderElement) {
      throw new Error("Component render element failed to initialize");
    }

    this.renderer = new NodeViewRenderer(
      this.renderElement,
      this.component,
      this.props
    );

    // Add the renderer to the editor's set of renderers so that it is included in the React tree.
    this.editor.renderers.add(this.renderer);

    // Apply decoration classes to the DOM element.
    this.applyDecorationClasses();
  }

  update(node: ProsemirrorNode, decorations: Decoration[]) {
    if (node.type !== this.node.type) {
      return false;
    }

    // Ensure we don't reuse NodeViews for different nodes that have a distinct identity
    // This prevents attribute swapping during drag operations.
    if (
      this.node.attrs.id !== undefined &&
      node.attrs.id !== this.node.attrs.id
    ) {
      return false;
    }

    this.node = node;
    this.decorations = decorations;
    this.applyDecorationClasses();
    this.renderer.updateProps(this.props);
    return true;
  }

  /**
   * Apply decoration classes to the DOM element.
   * Extracts classes from inline decorations that overlap with this node's position.
   */
  private applyDecorationClasses() {
    if (!this.dom) {
      return;
    }

    const nextDecorationClassNames = new Set<string>();

    // Collect classes from inline and node decorations.
    this.decorations.forEach((decoration) => {
      // For inline decorations, attrs contain the class property.
      const attrs = (
        decoration as Decoration & { type?: { attrs?: { class?: string } } }
      ).type?.attrs;
      if (attrs?.class) {
        const classes = attrs.class.split(" ");
        classes.forEach((className) => {
          if (className) {
            nextDecorationClassNames.add(className);
          }
        });
      }
    });

    for (const className of this.appliedDecorationClassNames) {
      if (!nextDecorationClassNames.has(className)) {
        this.dom.classList.remove(className);
      }
    }

    for (const className of nextDecorationClassNames) {
      if (!this.baseClassNames.has(className)) {
        this.dom.classList.add(className);
      }
    }

    this.appliedDecorationClassNames = nextDecorationClassNames;
  }

  selectNode() {
    if (this.view.editable) {
      this.isSelected = true;
      this.renderer.updateProps(this.props);
    }
  }

  deselectNode() {
    if (this.view.editable) {
      this.isSelected = false;
      this.renderer.updateProps(this.props);
    }
  }

  stopEvent(event: Event) {
    return (
      event.type !== "mousedown" &&
      !event.type.startsWith("drag") &&
      !event.type.startsWith("drop")
    );
  }

  destroy() {
    this.editor.renderers.delete(this.renderer);
    this.dom = null;
    this.renderElement = null;
  }

  ignoreMutation() {
    return true;
  }

  get props() {
    return {
      node: this.node,
      view: this.view,
      isSelected: this.isSelected,
      isEditable: this.view.editable,
      getPos: this.getPos,
      decorations: this.decorations,
    } as ComponentProps;
  }
}

function shouldUseBlockComponentView(node: ProsemirrorNode) {
  return !node.type.spec.inline || blockLikeInlineNodeNames.has(node.type.name);
}
