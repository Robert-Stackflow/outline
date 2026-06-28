import type Token from "markdown-it/lib/token.mjs";
import type { NodeSpec } from "prosemirror-model";
import type { EditorState } from "prosemirror-state";
import { Plugin, PluginKey } from "prosemirror-state";
import { DecorationSet, Decoration } from "prosemirror-view";
import { TableMap } from "prosemirror-tables";
import {
  getCellAttrs,
  isValidCellAlignment,
  isValidCellMarks,
  setCellAttrs,
} from "../lib/table";
import { getCellsInColumn } from "../queries/table";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import Node from "./Node";
import { columnDragPluginKey, type ColumnDragState } from "../plugins/TableDragState";

/**
 * Builds a widget decoration for the column drag indicator.
 */
function buildColumnDragIndicator(
  pos: number,
  isMovingRight: boolean
): Decoration {
  const className = isMovingRight
    ? EditorStyleHelper.tableDragIndicatorRight
    : EditorStyleHelper.tableDragIndicatorLeft;

  return Decoration.widget(
    pos + 1,
    () => {
      const indicator = document.createElement("div");
      indicator.className = className;
      return indicator;
    },
    {
      key: `column-drag-indicator-${pos}`,
    }
  );
}

/**
 * Creates decorations for the column drag drop indicator.
 */
function createColumnDragDecorations(state: EditorState): DecorationSet {
  const dragState = columnDragPluginKey.getState(state);

  if (!dragState?.isDragging || dragState.toIndex < 0) {
    return DecorationSet.empty;
  }

  const decorations: Decoration[] = [];
  const isMovingRight = dragState.toIndex > dragState.fromIndex;

  // Get first cell in the target column to place the indicator
  const cellsInColumn = getCellsInColumn(dragState.toIndex)(state);
  if (cellsInColumn.length > 0) {
    decorations.push(buildColumnDragIndicator(cellsInColumn[0], isMovingRight));
  }

  return DecorationSet.create(state.doc, decorations);
}

export default class TableHeader extends Node {
  get name() {
    return "th";
  }

  get schema(): NodeSpec {
    return {
      content: "block+",
      tableRole: "header_cell",
      group: "cell",
      isolating: true,
      parseDOM: [{ tag: "th", getAttrs: getCellAttrs }],
      toDOM(node) {
        return ["th", setCellAttrs(node), 0];
      },
      attrs: {
        colspan: { default: 1 },
        rowspan: { default: 1 },
        alignment: { default: null, validate: isValidCellAlignment },
        colwidth: { default: null },
        marks: {
          default: undefined,
          validate: (value: unknown) =>
            isValidCellMarks(value, this.editor?.schema),
        },
      },
    };
  }

  toMarkdown() {
    // see: renderTable
  }

  parseMarkdown() {
    return {
      block: "th",
      getAttrs: (tok: Token) => ({
        alignment: isValidCellAlignment(tok.info) ? tok.info : null,
      }),
    };
  }

  get plugins() {
    // Plugin for column drag and drop indicator
    const columnDragPlugin = new Plugin<ColumnDragState>({
      key: columnDragPluginKey,
      state: {
        init: () => ({ isDragging: false, fromIndex: -1, toIndex: -1 }),
        apply: (tr, state) => {
          const meta = tr.getMeta(columnDragPluginKey);
          if (meta) {
            return meta;
          }
          return state;
        },
      },
      props: {
        decorations: createColumnDragDecorations,
      },
    });

    const createHeaderDecorations = (state: EditorState) => {
      const { doc } = state;
      const decorations: Decoration[] = [];

      // Iterate through all tables in the document
      doc.descendants((node, pos) => {
        if (node.type.spec.tableRole === "table") {
          const map = TableMap.get(node);

          // Mark cells in the first column and last row of this table
          node.descendants((cellNode, cellPos) => {
            if (cellNode.type.spec.tableRole === "header_cell") {
              const cellOffset = cellPos;
              const cellIndex = map.map.indexOf(cellOffset);

              if (cellIndex !== -1) {
                const col = cellIndex % map.width;
                const row = Math.floor(cellIndex / map.width);
                const rowspan = cellNode.attrs.rowspan || 1;
                const colspan = cellNode.attrs.colspan || 1;
                const attrs: Record<string, string> = {};

                if (col === 0) {
                  attrs["data-first-column"] = "true";
                }

                // Mark cells that extend into the last column (accounting for colspan)
                if (col + colspan >= map.width) {
                  attrs["data-last-column"] = "true";
                }

                // Mark cells that extend into the last row (accounting for rowspan)
                if (row + rowspan >= map.height) {
                  attrs["data-last-row"] = "true";
                }

                if (Object.keys(attrs).length > 0) {
                  decorations.push(
                    Decoration.node(
                      pos + cellPos + 1,
                      pos + cellPos + 1 + cellNode.nodeSize,
                      attrs
                    )
                  );
                }
              }
            }
          });
        }
      });

      return DecorationSet.create(doc, decorations);
    };

    return [
      columnDragPlugin,
      new Plugin({
        key: new PluginKey("table-header-first-column"),
        state: {
          init: (_, state) => createHeaderDecorations(state),
          apply: (tr, pluginState, oldState, newState) => {
            // Only recompute if document changed
            if (!tr.docChanged) {
              return pluginState;
            }

            return createHeaderDecorations(newState);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  }
}
