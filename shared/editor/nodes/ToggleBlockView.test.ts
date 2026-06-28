import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { DecorationSet } from "prosemirror-view";
import { afterEach, describe, expect, it } from "vitest";
import { schema, p } from "../../test/editor";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import { ToggleBlockView } from "./ToggleBlockView";

describe.skipIf(typeof document === "undefined")("ToggleBlockView", () => {
  let view: EditorView | undefined;

  afterEach(() => {
    view?.destroy();
    view = undefined;
  });

  it("renders a selectable halo for block backgrounds", () => {
    const node = schema.nodes.container_toggle.create(
      { id: "toggle-test" },
      p("Title")
    );
    const state = EditorState.create({
      doc: schema.nodes.doc.create(null, [node]),
      schema,
    });
    view = new EditorView(document.createElement("div"), { state });

    const nodeView = new ToggleBlockView(
      node,
      view,
      () => 0,
      [],
      DecorationSet.empty
    );

    expect(
      nodeView.dom.querySelector(`.${EditorStyleHelper.blockHalo}`)
    ).not.toBeNull();
  });
});
