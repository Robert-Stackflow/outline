import type { Node as ProsemirrorNode } from "prosemirror-model";
import { TextSelection } from "prosemirror-state";
import type { EditorState } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { findTable, TableMap } from "prosemirror-tables";

export interface TableControlCell {
  /** Absolute document position for the cell that owns the control. */
  pos: number;
  /** Visual row or column index controlled by the cell. */
  index: number;
  /** Absolute document position of the parent table. */
  tablePos: number;
  /** Whether this is the first visual row or column. */
  first: boolean;
  /** Whether this is the last visual row or column. */
  last: boolean;
}

export interface TableRowControlCell extends TableControlCell {
  /** Number of visual rows spanned by the first cell in this row. */
  rowspan: number;
}

/**
 * Gets row control anchor cells for every table in the document.
 *
 * @param doc - the document node.
 * @returns row control cells for all tables.
 */
export function getTableRowControlCells(
  doc: ProsemirrorNode
): TableRowControlCell[] {
  const controls: TableRowControlCell[] = [];

  doc.descendants((node, tablePos) => {
    if (node.type.spec.tableRole !== "table") {
      return;
    }

    const map = TableMap.get(node);
    const tableStart = tablePos + 1;
    const firstColumnCells = new Map<number, number>();
    const seenFirstColumnCells = new Set<number>();

    for (let row = 0; row < map.height; row += 1) {
      firstColumnCells.set(row, tableStart + map.map[row * map.width]);
    }

    for (let row = 0; row < map.height; row += 1) {
      const cellPos = firstColumnCells.get(row);
      if (cellPos === undefined) {
        continue;
      }

      if (seenFirstColumnCells.has(cellPos)) {
        continue;
      }
      seenFirstColumnCells.add(cellPos);

      const cell = node.nodeAt(cellPos - tableStart);
      const rawRowspan = cell?.attrs.rowspan;
      const rowspan = typeof rawRowspan === "number" ? rawRowspan : 1;

      controls.push({
        pos: cellPos,
        index: row,
        tablePos,
        first: row === 0,
        last: row + rowspan >= map.height,
        rowspan,
      });
    }
  });

  return controls;
}

/**
 * Gets column control anchor cells for every table in the document.
 *
 * @param doc - the document node.
 * @returns column control cells for all tables.
 */
export function getTableColumnControlCells(
  doc: ProsemirrorNode
): TableControlCell[] {
  const controls: TableControlCell[] = [];

  doc.descendants((node, tablePos) => {
    if (node.type.spec.tableRole !== "table") {
      return;
    }

    const map = TableMap.get(node);
    const tableStart = tablePos + 1;

    for (let column = 0; column < map.width; column += 1) {
      controls.push({
        pos: tableStart + map.map[column],
        index: column,
        tablePos,
        first: column === 0,
        last: column === map.width - 1,
      });
    }
  });

  return controls;
}

/**
 * Checks whether the current selection belongs to the table at a position.
 *
 * @param state - the editor state.
 * @param tablePos - the absolute table position.
 * @returns true when the selection is inside the requested table.
 */
export function isSelectionInTableAt(
  state: EditorState,
  tablePos: number
): boolean {
  return findTable(state.selection.$from)?.pos === tablePos;
}

/**
 * Sets data attributes needed to route table chrome events back to a table.
 *
 * @param element - the control element.
 * @param cell - the table control cell.
 */
export function setTableControlData(
  element: HTMLElement,
  cell: TableControlCell
): void {
  element.dataset.cellPos = cell.pos.toString();
  element.dataset.index = cell.index.toString();
  element.dataset.tablePos = cell.tablePos.toString();
}

/**
 * Moves the editor selection into the table that owns a control.
 *
 * @param view - the editor view.
 * @param control - the clicked table control.
 * @returns true when the selection could be activated.
 */
export function activateTableControl(
  view: EditorView,
  control: Element
): boolean {
  if (!(control instanceof HTMLElement)) {
    return false;
  }

  const tablePos = getControlNumber(control, "tablePos");
  const cellPos = getControlNumber(control, "cellPos");
  if (tablePos === undefined || cellPos === undefined) {
    return false;
  }

  if (isSelectionInTableAt(view.state, tablePos)) {
    view.focus();
    return true;
  }

  const selectionPos = Math.min(cellPos + 1, view.state.doc.content.size);
  const selection = TextSelection.near(view.state.doc.resolve(selectionPos));
  view.dispatch(
    view.state.tr.setSelection(selection).setMeta("addToHistory", false)
  );
  view.focus();
  return true;
}

function getControlNumber(
  element: HTMLElement,
  key: "cellPos" | "tablePos"
): number | undefined {
  const value = element.dataset[key];
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return undefined;
  }

  return parsed;
}
