import { DoneIcon, InfoIcon, StarredIcon, WarningIcon } from "outline-icons";
import type { Node as ProsemirrorNode } from "prosemirror-model";
import type { NodeView } from "prosemirror-view";
import * as React from "react";
import ReactDOM from "react-dom";
import {
  createBlockViewElements,
  shouldIgnoreBlockViewMutation,
} from "../lib/blockView";

const noticeTypes = ["info", "success", "tip", "warning"];

/**
 * NodeView for notice containers with real chrome, content, and halo layers.
 */
export class NoticeView implements NodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;

  private readonly icon: HTMLElement;

  constructor(node: ProsemirrorNode) {
    const elements = createBlockViewElements({
      nodeName: node.type.name,
      role: "notice",
      classNames: ["notice-block"],
      contentClassNames: ["content"],
      chrome: true,
      indicatorClassNames: ["notice-indicator"],
    });

    if (!elements.indicator) {
      throw new Error("Notice block chrome failed to initialize");
    }

    this.dom = elements.dom;
    this.contentDOM = elements.contentDOM;

    const bar = document.createElement("span");
    bar.className = "notice-bar";

    this.icon = document.createElement("span");
    this.icon.className = "icon";

    elements.indicator.appendChild(bar);
    elements.indicator.appendChild(this.icon);

    this.updateNoticeStyle(node);
  }

  update(node: ProsemirrorNode) {
    if (node.type.name !== "container_notice") {
      return false;
    }

    this.updateNoticeStyle(node);
    return true;
  }

  ignoreMutation(mutation: MutationRecord) {
    return shouldIgnoreBlockViewMutation(this.contentDOM, mutation);
  }

  destroy() {
    ReactDOM.unmountComponentAtNode(this.icon);
  }

  private updateNoticeStyle(node: ProsemirrorNode) {
    for (const style of noticeTypes) {
      this.dom.classList.toggle(style, node.attrs.style === style);
    }

    ReactDOM.render(iconForNoticeStyle(node.attrs.style), this.icon);
  }
}

function iconForNoticeStyle(style: string) {
  if (style === "tip") {
    return <StarredIcon />;
  }
  if (style === "warning") {
    return <WarningIcon />;
  }
  if (style === "success") {
    return <DoneIcon />;
  }

  return <InfoIcon />;
}
