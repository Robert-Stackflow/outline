import type { Node as ProsemirrorNode } from "prosemirror-model";
import type { EditorView } from "prosemirror-view";
import {
  findTable,
  isInTable,
  moveTableColumn,
  moveTableRow,
  TableView as ProsemirrorTableView,
} from "prosemirror-tables";
import {
  addColumnBefore,
  addRowBefore,
  selectColumn,
  selectRow,
  selectTable,
} from "../commands/table";
import { attachBlockViewHalo } from "../lib/blockView";
import {
  activateTableControl,
  getTableColumnControlCells,
  getTableRowControlCells,
  isSelectionInTableAt,
  setTableControlData,
  type TableControlCell,
  type TableRowControlCell,
} from "../lib/tableControls";
import {
  columnDragPluginKey,
  rowDragPluginKey,
} from "../plugins/TableDragState";
import {
  getCellsInRow,
  getRowsInTable,
  isColumnSelected,
  isRowSelected,
  isTableSelected,
} from "../queries/table";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import { cn } from "../styles/utils";
import { TableLayout } from "../types";
import { isBrowser, isMobile } from "../../utils/browser";

interface TableControlBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

type TableControlKind =
  | "add-column"
  | "add-row"
  | "column-grip"
  | "row-grip"
  | "table-grip";

/**
 * NodeView for tables, including the dedicated overlay layer for table chrome.
 */
export class TableView extends ProsemirrorTableView {
  private static readonly instances = new Set<TableView>();

  /** Default height of the app's fixed header */
  private static readonly HEADER_HEIGHT = 64;

  /**
   * Refreshes table overlay controls owned by an editor view.
   *
   * @param editorView - the editor view whose table controls should refresh.
   */
  public static updateControlsForEditor(editorView: EditorView): void {
    for (const instance of TableView.instances) {
      if (instance.editorView === editorView) {
        instance.updateControls();
      }
    }
  }

  public constructor(
    public node: ProsemirrorNode,
    public cellMinWidth: number,
    private readonly editorView?: EditorView
  ) {
    super(node, cellMinWidth);

    this.dom.removeChild(this.table);
    this.dom.classList.add(EditorStyleHelper.table);

    // Add an extra wrapper to enable scrolling
    this.scrollable = this.dom.appendChild(document.createElement("div"));
    this.scrollable.appendChild(this.table);
    this.scrollable.classList.add(
      EditorStyleHelper.blockContent,
      EditorStyleHelper.tableScrollable
    );

    attachBlockViewHalo(this.dom, {
      nodeName: node.type.name,
      role: "table",
    });

    this.controlsLayer = this.dom.appendChild(document.createElement("div"));
    this.controlsLayer.classList.add(EditorStyleHelper.tableControls);
    this.controlsLayer.contentEditable = "false";
    this.controlsLayer.addEventListener(
      "mousedown",
      this.handleControlMouseDown
    );
    this.controlsLayer.addEventListener("click", this.handleControlClick);

    if (isBrowser) {
      TableView.instances.add(this);
      this.scrollable.addEventListener("scroll", this.handleLayoutChange, {
        passive: true,
      });
      window.addEventListener("resize", this.handleLayoutChange, {
        passive: true,
      });
    }

    this.updateClassList(node);
    this.updateControls();

    // We need to wait for the next tick to ensure dom is rendered and scroll shadows are correct.
    if (isBrowser) {
      setTimeout(() => {
        if (this.dom) {
          this.updateClassList(node);
          this.updateControls();
        }
      }, 0);
    }

    // Set up sticky header handling
    this.setupStickyHeader();
  }

  public destroy() {
    TableView.instances.delete(this);
    this.controlsLayer.removeEventListener(
      "mousedown",
      this.handleControlMouseDown
    );
    this.controlsLayer.removeEventListener("click", this.handleControlClick);
    this.scrollable?.removeEventListener("scroll", this.handleLayoutChange);
    if (isBrowser) {
      window.removeEventListener("resize", this.handleLayoutChange);
    }
    if (this.animationFrame !== undefined) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = undefined;
    }
    if (isBrowser) {
      document.removeEventListener(
        "click",
        this.handleSuppressedDocumentClick,
        true
      );
    }
    this.cleanupStickyHeader();
  }

  public override update(node: ProsemirrorNode) {
    const updated = super.update(node);
    if (!updated) {
      return false;
    }

    this.updateClassList(node);
    this.queueControlUpdate();
    return true;
  }

  public override ignoreMutation(record: MutationRecord): boolean {
    if (
      record.type === "attributes" &&
      record.target === this.dom &&
      (record.attributeName === "class" || record.attributeName === "style")
    ) {
      return true;
    }

    if (
      record.target === this.controlsLayer ||
      this.controlsLayer.contains(record.target)
    ) {
      return true;
    }

    return (
      record.type === "attributes" &&
      (record.target === this.table || this.colgroup.contains(record.target))
    );
  }

  private updateClassList(node: ProsemirrorNode) {
    if (!isBrowser) {
      return;
    }

    this.dom.classList.toggle(
      EditorStyleHelper.tableFullWidth,
      node.attrs.layout === TableLayout.fullWidth
    );

    const shadowLeft = !!(this.scrollable && this.scrollable.scrollLeft > 0);
    const shadowRight = !!(
      this.scrollable &&
      this.scrollable.scrollWidth > this.scrollable.clientWidth &&
      this.scrollable.scrollLeft + this.scrollable.clientWidth <
        this.scrollable.scrollWidth - 1
    );

    this.dom.classList.toggle(EditorStyleHelper.tableShadowLeft, shadowLeft);
    this.dom.classList.toggle(EditorStyleHelper.tableShadowRight, shadowRight);

    if (this.scrollable) {
      const tableWidth = this.table.clientWidth || this.scrollable.clientWidth;
      const tableHeight =
        this.table.clientHeight || this.scrollable.clientHeight;

      this.dom.style.setProperty("--table-height", `${tableHeight}px`);
      this.dom.style.setProperty("--table-width", `${tableWidth}px`);
    } else {
      this.dom.style.removeProperty("--table-height");
      this.dom.style.removeProperty("--table-width");
    }
  }

  private updateControls(): void {
    if (!this.editorView || !this.editorView.editable) {
      this.controlsLayer.replaceChildren();
      return;
    }

    const tablePos = this.getTablePos();
    if (tablePos === undefined) {
      this.controlsLayer.replaceChildren();
      return;
    }

    const rowDragState = rowDragPluginKey.getState(this.editorView.state);
    const columnDragState = columnDragPluginKey.getState(this.editorView.state);
    const isDragging = !!(
      rowDragState?.isDragging || columnDragState?.isDragging
    );
    const rows = getTableRowControlCells(this.editorView.state.doc).filter(
      (cell) => cell.tablePos === tablePos
    );
    const columns = getTableColumnControlCells(
      this.editorView.state.doc
    ).filter((cell) => cell.tablePos === tablePos);
    const selectedTable = isSelectionInTableAt(this.editorView.state, tablePos);
    const tableSelected =
      selectedTable && isTableSelected(this.editorView.state);
    const tableBox = this.getRelativeBox(this.table);
    const rowBoxes = this.getRowBoxes();
    const columnBoxes = this.getColumnBoxes();
    const fragment = document.createDocumentFragment();
    const addRows = new Set<number>();
    const addColumns = new Set<number>();

    for (const row of rows) {
      const box = rowBoxes[row.index] ?? {
        left: tableBox.left,
        top: tableBox.top,
        width: tableBox.width,
        height: 0,
      };

      if (row.index === 0) {
        fragment.appendChild(
          this.createControl(
            "table-grip",
            cn(EditorStyleHelper.tableGrip, { selected: tableSelected }),
            row,
            0,
            {
              left: tableBox.left,
              top: tableBox.top,
              width: 18,
              height: 18,
            }
          )
        );
      }

      fragment.appendChild(
        this.createRowGrip(
          row,
          box,
          selectedTable && isRowSelected(row.index)(this.editorView.state)
        )
      );

      if (!isDragging && !isMobile()) {
        if (row.index === 0 && !addRows.has(0)) {
          addRows.add(0);
          fragment.appendChild(
            this.createAddRowControl(row, 0, tableBox, tableBox.top)
          );
        }

        const nextIndex = row.index + row.rowspan;
        if (!addRows.has(nextIndex)) {
          addRows.add(nextIndex);
          fragment.appendChild(
            this.createAddRowControl(
              row,
              nextIndex,
              tableBox,
              box.top + box.height
            )
          );
        }
      }
    }

    for (const column of columns) {
      const box = columnBoxes[column.index] ?? {
        left: tableBox.left,
        top: tableBox.top,
        width: 0,
        height: tableBox.height,
      };

      fragment.appendChild(
        this.createColumnGrip(
          column,
          box,
          selectedTable && isColumnSelected(column.index)(this.editorView.state)
        )
      );

      if (!isDragging && !isMobile()) {
        if (column.index === 0 && !addColumns.has(0)) {
          addColumns.add(0);
          fragment.appendChild(
            this.createAddColumnControl(column, 0, tableBox, box.left)
          );
        }

        const nextIndex = column.index + 1;
        if (!addColumns.has(nextIndex)) {
          addColumns.add(nextIndex);
          fragment.appendChild(
            this.createAddColumnControl(
              column,
              nextIndex,
              tableBox,
              box.left + box.width
            )
          );
        }
      }
    }

    this.controlsLayer.replaceChildren(fragment);
  }

  private createRowGrip(
    cell: TableRowControlCell,
    box: TableControlBox,
    selected: boolean
  ): HTMLButtonElement {
    return this.createControl(
      "row-grip",
      cn(EditorStyleHelper.tableGripRow, {
        selected,
        first: cell.first,
        last: cell.last,
      }),
      cell,
      cell.index,
      {
        left: box.left,
        top: box.top,
        width: 12,
        height: box.height,
      }
    );
  }

  private createColumnGrip(
    cell: TableControlCell,
    box: TableControlBox,
    selected: boolean
  ): HTMLButtonElement {
    return this.createControl(
      "column-grip",
      cn(EditorStyleHelper.tableGripColumn, {
        selected,
        first: cell.first,
        last: cell.last,
      }),
      cell,
      cell.index,
      {
        left: box.left,
        top: box.top - 12,
        width: box.width,
        height: 12,
      }
    );
  }

  private createAddRowControl(
    cell: TableRowControlCell,
    index: number,
    tableBox: TableControlBox,
    y: number
  ): HTMLButtonElement {
    return this.createControl(
      "add-row",
      cn(EditorStyleHelper.tableAddRow, { first: index === 0 }),
      cell,
      index,
      {
        left: tableBox.left,
        top: y - 9,
        width: tableBox.width,
        height: 18,
      }
    );
  }

  private createAddColumnControl(
    cell: TableControlCell,
    index: number,
    tableBox: TableControlBox,
    x: number
  ): HTMLButtonElement {
    const width = 18;
    const minLeft = tableBox.left;
    const maxLeft = tableBox.left + Math.max(0, tableBox.width - width);
    const left = Math.min(Math.max(x - width / 2, minLeft), maxLeft);

    return this.createControl(
      "add-column",
      cn(EditorStyleHelper.tableAddColumn, { first: index === 0 }),
      cell,
      index,
      {
        left,
        top: tableBox.top - 18,
        width,
        height: 26,
      }
    );
  }

  private createControl(
    kind: TableControlKind,
    className: string,
    cell: TableControlCell,
    index: number,
    box: TableControlBox
  ): HTMLButtonElement {
    const control = document.createElement("button");
    control.type = "button";
    control.tabIndex = -1;
    control.contentEditable = "false";
    control.className = cn(EditorStyleHelper.tableControl, className);
    control.dataset.controlKind = kind;
    control.dataset.index = index.toString();
    setTableControlData(control, cell);
    this.applyBox(control, box);

    const surface = document.createElement("span");
    surface.className = EditorStyleHelper.tableControlSurface;
    surface.setAttribute("aria-hidden", "true");
    control.appendChild(surface);

    return control;
  }

  private applyBox(element: HTMLElement, box: TableControlBox): void {
    element.style.left = `${box.left}px`;
    element.style.top = `${box.top}px`;
    element.style.width = `${box.width}px`;
    element.style.height = `${box.height}px`;
  }

  private getRowBoxes(): TableControlBox[] {
    return Array.from(this.table.rows).map((row) => this.getRelativeBox(row));
  }

  private getColumnBoxes(): TableControlBox[] {
    const firstRow = this.table.rows.item(0);
    if (!firstRow) {
      return [];
    }

    const boxes: TableControlBox[] = [];
    for (const cell of Array.from(firstRow.cells)) {
      const cellBox = this.getRelativeBox(cell);
      const colspan = Math.max(1, cell.colSpan);
      const width = cellBox.width / colspan;

      for (let offset = 0; offset < colspan; offset += 1) {
        boxes.push({
          left: cellBox.left + width * offset,
          top: cellBox.top,
          width,
          height: cellBox.height,
        });
      }
    }

    return boxes;
  }

  private getRelativeBox(element: HTMLElement): TableControlBox {
    const rootBox = this.dom.getBoundingClientRect();
    const elementBox = element.getBoundingClientRect();

    return {
      left: elementBox.left - rootBox.left,
      top: elementBox.top - rootBox.top,
      width: elementBox.width,
      height: elementBox.height,
    };
  }

  private getTablePos(): number | undefined {
    if (!this.editorView) {
      return undefined;
    }

    try {
      const position = this.editorView.posAtDOM(this.contentDOM, 0);
      const table = findTable(this.editorView.state.doc.resolve(position));
      if (table) {
        return table.pos;
      }
    } catch {
      // Fall back to matching the node object below.
    }

    let tablePos: number | undefined;
    this.editorView.state.doc.descendants((node, pos) => {
      if (tablePos === undefined && node === this.node) {
        tablePos = pos;
      }
    });

    return tablePos;
  }

  private queueControlUpdate(): void {
    if (!isBrowser) {
      return;
    }

    if (this.animationFrame !== undefined) {
      cancelAnimationFrame(this.animationFrame);
    }

    this.animationFrame = requestAnimationFrame(() => {
      this.animationFrame = undefined;
      this.updateControls();
    });
  }

  private readonly handleLayoutChange = () => {
    this.updateClassList(this.node);
    this.queueControlUpdate();
  };

  private readonly handleControlMouseDown = (event: MouseEvent): void => {
    if (!this.editorView || !(event.target instanceof Element)) {
      return;
    }

    const control = event.target.closest(`.${EditorStyleHelper.tableControl}`);
    if (!(control instanceof HTMLElement)) {
      return;
    }

    if (!this.controlsLayer.contains(control)) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    this.suppressNextDocumentClick();

    if (!activateTableControl(this.editorView, control)) {
      return;
    }

    const index = this.getControlIndex(control);
    if (index === undefined) {
      return;
    }

    switch (control.dataset.controlKind) {
      case "add-row":
        addRowBefore({ index })(
          this.editorView.state,
          this.editorView.dispatch
        );
        this.queueControlUpdate();
        return;

      case "add-column":
        addColumnBefore({ index })(
          this.editorView.state,
          this.editorView.dispatch
        );
        this.queueControlUpdate();
        return;

      case "row-grip":
        selectRow(index, event.metaKey || event.shiftKey)(
          this.editorView.state,
          this.editorView.dispatch
        );
        this.setupRowDragTracking(index);
        return;

      case "column-grip":
        selectColumn(index, event.metaKey || event.shiftKey)(
          this.editorView.state,
          this.editorView.dispatch
        );
        this.setupColumnDragTracking(index);
        return;

      case "table-grip":
        selectTable()(this.editorView.state, this.editorView.dispatch);
        this.queueControlUpdate();
        return;

      default:
        return;
    }
  };

  private readonly handleControlClick = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const control = event.target.closest(`.${EditorStyleHelper.tableControl}`);
    if (!(control instanceof HTMLElement)) {
      return;
    }

    if (!this.controlsLayer.contains(control)) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
  };

  private suppressNextDocumentClick(): void {
    if (!isBrowser) {
      return;
    }

    document.removeEventListener(
      "click",
      this.handleSuppressedDocumentClick,
      true
    );
    document.addEventListener(
      "click",
      this.handleSuppressedDocumentClick,
      true
    );
  }

  private readonly handleSuppressedDocumentClick = (
    event: MouseEvent
  ): void => {
    if (isBrowser) {
      document.removeEventListener(
        "click",
        this.handleSuppressedDocumentClick,
        true
      );
    }
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  private setupRowDragTracking(fromIndex: number): void {
    if (!this.editorView) {
      return;
    }

    const view = this.editorView;
    let isDragging = false;
    let currentToIndex = fromIndex;

    const updateDragState = (toIndex: number) => {
      view.dispatch(
        view.state.tr.setMeta(rowDragPluginKey, {
          isDragging: true,
          fromIndex,
          toIndex,
        })
      );
    };

    const clearDragState = () => {
      view.dispatch(
        view.state.tr.setMeta(rowDragPluginKey, {
          isDragging: false,
          fromIndex: -1,
          toIndex: -1,
        })
      );
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging) {
        isDragging = true;
        document.body.classList.add(EditorStyleHelper.tableDragging);
      }

      const rows = getRowsInTable(view.state);
      let targetIndex = fromIndex;

      Array.from(this.table.rows).forEach((row, index) => {
        const rowBox = row.getBoundingClientRect();
        if (event.clientY >= rowBox.top && event.clientY <= rowBox.bottom) {
          targetIndex = index;
        }
      });

      targetIndex = Math.max(0, Math.min(targetIndex, rows.length - 1));

      if (targetIndex !== currentToIndex) {
        currentToIndex = targetIndex;
        updateDragState(targetIndex);
        this.queueControlUpdate();
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.classList.remove(EditorStyleHelper.tableDragging);

      if (isDragging && currentToIndex !== fromIndex && isInTable(view.state)) {
        const currentRows = getRowsInTable(view.state);
        const inBounds =
          fromIndex >= 0 &&
          fromIndex < currentRows.length &&
          currentToIndex >= 0 &&
          currentToIndex < currentRows.length;

        if (inBounds) {
          const moved = moveTableRow({ from: fromIndex, to: currentToIndex })(
            view.state,
            view.dispatch
          );
          if (moved) {
            selectRow(currentToIndex)(view.state, view.dispatch);
          }
        }
      }

      clearDragState();
      this.queueControlUpdate();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  private setupColumnDragTracking(fromIndex: number): void {
    if (!this.editorView) {
      return;
    }

    const view = this.editorView;
    let isDragging = false;
    let currentToIndex = fromIndex;

    const updateDragState = (toIndex: number) => {
      view.dispatch(
        view.state.tr.setMeta(columnDragPluginKey, {
          isDragging: true,
          fromIndex,
          toIndex,
        })
      );
    };

    const clearDragState = () => {
      view.dispatch(
        view.state.tr.setMeta(columnDragPluginKey, {
          isDragging: false,
          fromIndex: -1,
          toIndex: -1,
        })
      );
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging) {
        isDragging = true;
        document.body.classList.add(EditorStyleHelper.tableDragging);
      }

      const columns = getCellsInRow(0)(view.state);
      let targetIndex = fromIndex;

      this.getColumnViewportBoxes().forEach((box, index) => {
        if (
          event.clientX >= box.left &&
          event.clientX <= box.left + box.width
        ) {
          targetIndex = index;
        }
      });

      targetIndex = Math.max(0, Math.min(targetIndex, columns.length - 1));

      if (targetIndex !== currentToIndex) {
        currentToIndex = targetIndex;
        updateDragState(targetIndex);
        this.queueControlUpdate();
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.classList.remove(EditorStyleHelper.tableDragging);

      if (isDragging && currentToIndex !== fromIndex && isInTable(view.state)) {
        const currentColumns = getCellsInRow(0)(view.state);
        const inBounds =
          fromIndex >= 0 &&
          fromIndex < currentColumns.length &&
          currentToIndex >= 0 &&
          currentToIndex < currentColumns.length;

        if (inBounds) {
          const moved = moveTableColumn({
            from: fromIndex,
            to: currentToIndex,
          })(view.state, view.dispatch);
          if (moved) {
            selectColumn(currentToIndex)(view.state, view.dispatch);
          }
        }
      }

      clearDragState();
      this.queueControlUpdate();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  private getColumnViewportBoxes(): TableControlBox[] {
    const firstRow = this.table.rows.item(0);
    if (!firstRow) {
      return [];
    }

    const boxes: TableControlBox[] = [];
    for (const cell of Array.from(firstRow.cells)) {
      const cellBox = cell.getBoundingClientRect();
      const colspan = Math.max(1, cell.colSpan);
      const width = cellBox.width / colspan;

      for (let offset = 0; offset < colspan; offset += 1) {
        boxes.push({
          left: cellBox.left + width * offset,
          top: cellBox.top,
          width,
          height: cellBox.height,
        });
      }
    }

    return boxes;
  }

  private getControlIndex(control: HTMLElement): number | undefined {
    const value = control.dataset.index;
    if (!value) {
      return undefined;
    }

    const index = Number(value);
    if (!Number.isInteger(index) || index < 0) {
      return undefined;
    }

    return index;
  }

  private scrollable: HTMLDivElement | null = null;

  private controlsLayer: HTMLDivElement;

  private animationFrame: number | undefined;

  private scrollHandler: (() => void) | null = null;

  /**
   * Sets up the scroll listener for sticky header behavior. Nested tables
   * (tables within another table) are excluded from sticky header behavior.
   */
  private setupStickyHeader() {
    if (!isBrowser) {
      return;
    }

    // Defer setup to ensure DOM is fully rendered
    setTimeout(() => {
      // Skip sticky header for nested tables
      if (this.dom.closest(`table .${EditorStyleHelper.table}`)) {
        return;
      }

      this.scrollHandler = () => {
        this.updateStickyHeader();
      };

      // Use capture phase on document to catch all scroll events
      document.addEventListener("scroll", this.scrollHandler, {
        passive: true,
        capture: true,
      });

      // Initial update
      this.updateStickyHeader();
    }, 0);
  }

  /**
   * Cleans up the scroll listener and resets header styles.
   */
  private cleanupStickyHeader() {
    if (!isBrowser) {
      return;
    }

    if (this.scrollHandler) {
      document.removeEventListener("scroll", this.scrollHandler, {
        capture: true,
      });
      this.scrollHandler = null;
    }

    // Reset sticky header state
    this.dom.classList.remove(EditorStyleHelper.tableStickyHeader);
    this.dom.style.removeProperty("--sticky-scroll-offset");
  }

  /**
   * Updates the header row transform to create a sticky effect.
   */
  private updateStickyHeader() {
    if (!isBrowser) {
      return;
    }

    const headerRow = this.table.querySelector("tr");
    if (!(headerRow instanceof HTMLTableRowElement)) {
      return;
    }

    const tableRect = this.table.getBoundingClientRect();
    const headerRowHeight = headerRow.getBoundingClientRect().height;
    const headerOffset = this.getHeaderOffset();

    // Check if the table top is above the header area but the table extends below it
    const shouldStick =
      tableRect.top < headerOffset &&
      tableRect.bottom > headerOffset + headerRowHeight;

    if (shouldStick) {
      // Set the raw scroll offset - CSS will add the header offset
      const scrollOffset = Math.min(
        -tableRect.top,
        tableRect.height - headerRowHeight
      );
      this.dom.classList.add(EditorStyleHelper.tableStickyHeader);
      this.dom.style.setProperty("--sticky-scroll-offset", `${scrollOffset}px`);
    } else {
      this.dom.classList.remove(EditorStyleHelper.tableStickyHeader);
      this.dom.style.removeProperty("--sticky-scroll-offset");
    }
  }

  /**
   * Gets the current header offset from the CSS variable.
   *
   * @returns the offset in pixels from the top of the viewport.
   */
  private getHeaderOffset(): number {
    if (!isBrowser) {
      return TableView.HEADER_HEIGHT;
    }

    const value = getComputedStyle(document.documentElement).getPropertyValue(
      "--header-offset"
    );
    return value ? parseFloat(value) : TableView.HEADER_HEIGHT;
  }
}
