import { EditorState, TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { afterEach, describe, expect, it } from "vitest";
import type { Editor } from "~/editor";
import { doc, p, schema, table, td, th, tr } from "@shared/test/editor";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import Table from "./Table";
import TableHeader from "./TableHeader";
import TableRow from "./TableRow";
import { TableView } from "./TableView";

describe.skipIf(typeof document === "undefined")("table controls", () => {
  let view: EditorView | undefined;

  afterEach(() => {
    view?.destroy();
    view = undefined;
  });

  it("renders table controls before the selection enters the table", () => {
    const testDoc = doc([
      p("Intro"),
      table([tr([th("Name"), th("Score")]), tr([td("Ada"), td("10")])]),
    ]);
    const plugins = tablePlugins();
    const state = EditorState.create({
      doc: testDoc,
      schema,
      plugins,
      selection: TextSelection.create(testDoc, 2),
    });
    const root = document.createElement("div");

    view = new EditorView(root, { state });
    expect(
      view.dom.querySelectorAll(`.${EditorStyleHelper.tableGripRow}`)
    ).toHaveLength(2);
    expect(
      view.dom.querySelectorAll(`.${EditorStyleHelper.tableGripColumn}`)
    ).toHaveLength(2);
    expect(
      view.dom.querySelectorAll(`.${EditorStyleHelper.tableGrip}`)
    ).toHaveLength(1);
  });

  it("renders table controls in a dedicated overlay outside cell widgets", () => {
    const testDoc = doc([
      p("Intro"),
      table([tr([th("Name"), th("Score")]), tr([td("Ada"), td("10")])]),
    ]);
    const plugins = tablePlugins();
    const state = EditorState.create({
      doc: testDoc,
      schema,
      plugins,
      selection: TextSelection.create(testDoc, 2),
    });
    const root = document.createElement("div");

    view = new EditorView(root, { state });

    const tableWrapper = view.dom.querySelector(`.${EditorStyleHelper.table}`);
    const controlsLayer = tableWrapper?.querySelector(".table-controls");
    const controls = tableWrapper?.querySelectorAll(
      [
        `.${EditorStyleHelper.tableGrip}`,
        `.${EditorStyleHelper.tableGripRow}`,
        `.${EditorStyleHelper.tableGripColumn}`,
        `.${EditorStyleHelper.tableAddRow}`,
        `.${EditorStyleHelper.tableAddColumn}`,
      ].join(",")
    );

    expect(controlsLayer).toBeInstanceOf(HTMLElement);
    expect(controls).toHaveLength(11);
    expect(
      Array.from(controls ?? []).every(
        (control) => !control.classList.contains("ProseMirror-widget")
      )
    ).toBe(true);
  });

  it("keeps table side chrome inside the document flow", () => {
    expect(EditorStyleHelper.tableControlGutter).toBe("0px");
  });

  it("does not position edge column controls outside the table wrapper", () => {
    const testDoc = doc([
      table([tr([th("Name"), th("Score")]), tr([td("Ada"), td("10")])]),
    ]);
    const plugins = tablePlugins();
    const state = EditorState.create({
      doc: testDoc,
      schema,
      plugins,
      selection: TextSelection.create(testDoc, 2),
    });
    const root = document.createElement("div");

    view = new EditorView(root, { state });

    const tableWrapper = view.dom.querySelector(`.${EditorStyleHelper.table}`);
    const tableElement = tableWrapper?.querySelector("table");
    const columnControls = tableWrapper?.querySelectorAll(
      `.${EditorStyleHelper.tableAddColumn}`
    );

    expect(
      tableElement?.querySelector(`.${EditorStyleHelper.tableControl}`)
    ).toBeNull();
    expect(columnControls).toHaveLength(3);
    expect(
      Array.from(columnControls ?? []).every(
        (control) =>
          control instanceof HTMLElement && !control.style.left.startsWith("-")
      )
    ).toBe(true);
  });

  it("hides passive table chrome until interaction", () => {
    expect(EditorStyleHelper.tableControlIdleOpacity).toBe("0");
    expect(EditorStyleHelper.tableControlActiveOpacity).toBe("1");
  });

  it("measures table content dimensions separately from scroll chrome", () => {
    const testDoc = doc([
      table([tr([th("Name"), th("Score")]), tr([td("Ada"), td("10")])]),
    ]);
    const tableNode = testDoc.firstChild;

    expect(tableNode).toBeTruthy();
    if (!tableNode) {
      return;
    }

    const tableView = new TableView(tableNode, 25);
    const scrollable = tableView.dom.querySelector(
      `.${EditorStyleHelper.tableScrollable}`
    );

    expect(scrollable).toBeInstanceOf(HTMLElement);
    if (!(scrollable instanceof HTMLElement)) {
      return;
    }

    Object.defineProperty(scrollable, "clientWidth", { value: 500 });
    Object.defineProperty(scrollable, "clientHeight", { value: 240 });
    Object.defineProperty(tableView.table, "clientWidth", { value: 333 });
    Object.defineProperty(tableView.table, "clientHeight", { value: 180 });

    tableView.update(tableNode);

    expect(tableView.dom.style.getPropertyValue("--table-width")).toBe("333px");
    expect(tableView.dom.style.getPropertyValue("--table-height")).toBe(
      "180px"
    );
  });
});

function tablePlugins() {
  const editor = { view: { editable: true } } as Editor;
  const tableNode = new Table();
  const tableRow = new TableRow();
  const tableHeader = new TableHeader();

  tableNode.bindEditor(editor);
  tableRow.bindEditor(editor);
  tableHeader.bindEditor(editor);

  return [...tableNode.plugins, ...tableRow.plugins, ...tableHeader.plugins];
}
