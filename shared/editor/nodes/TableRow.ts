import type { NodeSpec } from "prosemirror-model";
import type { EditorState } from "prosemirror-state";
import Node from "./Node";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import { Decoration, DecorationSet } from "prosemirror-view";
import { Plugin } from "prosemirror-state";
import { getCellsInRow } from "../queries/table";
import { rowDragPluginKey, type RowDragState } from "../plugins/TableDragState";

/**
 * Builds a widget decoration for the row drag indicator.
 */
function buildRowDragIndicator(pos: number, isMovingDown: boolean): Decoration {
  const className = isMovingDown
    ? EditorStyleHelper.tableDragIndicatorBottom
    : EditorStyleHelper.tableDragIndicatorTop;

  return Decoration.widget(
    pos + 1,
    () => {
      const indicator = document.createElement("div");
      indicator.className = className;
      return indicator;
    },
    {
      key: `row-drag-indicator-${pos}`,
    }
  );
}

/**
 * Creates decorations for the row drag drop indicator.
 */
function createRowDragDecorations(state: EditorState): DecorationSet {
  const dragState = rowDragPluginKey.getState(state);

  if (!dragState?.isDragging || dragState.toIndex < 0) {
    return DecorationSet.empty;
  }

  const decorations: Decoration[] = [];
  const isMovingDown = dragState.toIndex > dragState.fromIndex;

  // Get first cell in the target row to place the indicator
  const cellsInRow = getCellsInRow(dragState.toIndex)(state);
  if (cellsInRow.length > 0) {
    decorations.push(buildRowDragIndicator(cellsInRow[0], isMovingDown));
  }

  return DecorationSet.create(state.doc, decorations);
}

export default class TableRow extends Node {
  get name() {
    return "tr";
  }

  get schema(): NodeSpec {
    return {
      content: "(th | td)*",
      tableRole: "row",
      parseDOM: [{ tag: "tr" }],
      toDOM() {
        return ["tr", 0];
      },
    };
  }

  get plugins() {
    // Plugin for row drag and drop indicator
    const rowDragPlugin = new Plugin<RowDragState>({
      key: rowDragPluginKey,
      state: {
        init: () => ({ isDragging: false, fromIndex: -1, toIndex: -1 }),
        apply: (tr, state) => {
          const meta = tr.getMeta(rowDragPluginKey);
          if (meta) {
            return meta;
          }
          return state;
        },
      },
      props: {
        decorations: createRowDragDecorations,
      },
    });

    return [rowDragPlugin];
  }

  toMarkdown() {
    // see: renderTable
  }

  parseMarkdown() {
    return { block: "tr" };
  }
}
