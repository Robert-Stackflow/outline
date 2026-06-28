/**
 * Class names and values used by the editor.
 */
export class EditorStyleHelper {
  // Blocks

  static readonly blockRadius = "6px";

  /** Block-level color decoration */
  static readonly blockColor = "block-color";

  /** Block view wrapper owned by a ProseMirror NodeView */
  static readonly blockView = "block-view";

  /** Non-editable chrome column for block indicators and controls */
  static readonly blockChrome = "block-chrome";

  /** Editable content region inside a block view */
  static readonly blockContent = "block-content";

  /** Real DOM background/selection layer inside a block view */
  static readonly blockHalo = "block-selectable-halo";

  /** Visual indicator element inside block chrome */
  static readonly blockIndicator = "block-indicator";

  /** List marker rendered as real DOM */
  static readonly blockListMarker = "block-list-marker";

  /** Quote indicator rendered as real DOM */
  static readonly blockQuoteBar = "block-quote-bar";

  // Images

  static readonly imageHandle = "image-handle";

  static readonly imageCaption = "caption";

  static readonly imagePositionAnchor = "image-position-anchor";

  /** Class added to body when resizing images/media */
  static readonly resizeDragging = "resize-dragging";

  // Headings

  static readonly headingPositionAnchor = "heading-position-anchor";

  // Comments

  static readonly comment = "comment-marker";

  // Multiplayer

  /** Remote collaborator's cursor */
  static readonly multiplayerCursor = "ProseMirror-yjs-cursor";

  /** Remote collaborator's selection */
  static readonly multiplayerSelection = "ProseMirror-yjs-selection";

  // Code

  static readonly codeBlock = "code-block";

  static readonly codeWord = "code-word";

  static readonly hexColorSwatch = "hex-color-swatch";

  static readonly hexColorSwatchLight = "hex-color-swatch-light";

  static readonly hexColorSwatchDark = "hex-color-swatch-dark";

  /** Toggle button for collapsible code blocks */
  static readonly codeBlockToggle = "code-block-toggle";

  // Diffs

  static readonly diffInsertion = "diff-insertion";

  static readonly diffDeletion = "diff-deletion";

  static readonly diffNodeInsertion = "diff-node-insertion";

  static readonly diffNodeDeletion = "diff-node-deletion";

  static readonly diffModification = "diff-modification";

  static readonly diffNodeModification = "diff-node-modification";

  static readonly diffCurrentChange = "current-diff";

  // Toggle blocks

  /** Toggle block wrapper */
  static readonly toggleBlock = "toggle-block";

  /** Toggle block button */
  static readonly toggleBlockButton = "toggle-block-button";

  /** Toggle block content area */
  static readonly toggleBlockContent = "toggle-block-content";

  /** Toggle block head (first child) */
  static readonly toggleBlockHead = "toggle-block-head";

  /** Toggle block folded state */
  static readonly toggleBlockFolded = "folded";

  // Checkbox Lists

  /** Checkbox list wrapper */
  static readonly checklistWrapper = "checklist-wrapper";

  /** Toggle button for showing/hiding completed items */
  static readonly checklistCompletedToggle = "checklist-completed-toggle";

  /** State when completed items are hidden */
  static readonly checklistCompletedHidden = "completed-hidden";

  // Tables

  /** Table wrapper */
  static readonly table = "table-wrapper";

  /** Overlay layer that owns table controls */
  static readonly tableControls = "table-controls";

  /** Base class for table control buttons */
  static readonly tableControl = "table-control";

  /** Inline gutter reserved around table chrome */
  static readonly tableControlGutter = "0px";

  /** Height for the styled horizontal table scrollbar */
  static readonly tableScrollbarHeight = "6px";

  /** Opacity for table chrome when it is not being interacted with */
  static readonly tableControlIdleOpacity = "0";

  /** Opacity for table chrome while hovered, selected, or dragging */
  static readonly tableControlActiveOpacity = "1";

  /** Table grip (circle in top left) */
  static readonly tableGrip = "table-grip";

  /** Real DOM surface inside table controls */
  static readonly tableControlSurface = "table-control-surface";

  /** Table row grip */
  static readonly tableGripRow = "table-grip-row";

  /** Table column grip */
  static readonly tableGripColumn = "table-grip-column";

  /** "Plus" to add column on tables */
  static readonly tableAddColumn = "table-add-column";

  /** "Plus" to add row on tables */
  static readonly tableAddRow = "table-add-row";

  /** Scrollable area of table */
  static readonly tableScrollable = "table-scrollable";

  /** Full-width table layout */
  static readonly tableFullWidth = "table-full-width";

  /** Shadow on the right side of the table */
  static readonly tableShadowRight = "table-shadow-right";

  /** Shadow on the left side of the table */
  static readonly tableShadowLeft = "table-shadow-left";

  /** Sticky header state */
  static readonly tableStickyHeader = "table-sticky-header";

  /** Drop indicator for table drag and drop */
  static readonly tableDragDropIndicator = "table-drag-drop-indicator";

  /** Class added to body when dragging table rows/columns */
  static readonly tableDragging = "table-dragging";

  /** Drag indicator on left side of cell */
  static readonly tableDragIndicatorLeft = "table-drag-indicator-left";

  /** Drag indicator on right side of cell */
  static readonly tableDragIndicatorRight = "table-drag-indicator-right";

  /** Drag indicator on top side of cell */
  static readonly tableDragIndicatorTop = "table-drag-indicator-top";

  /** Drag indicator on bottom side of cell */
  static readonly tableDragIndicatorBottom = "table-drag-indicator-bottom";

  /** Table of contents width */
  static readonly tocWidth = 256;

  /** Width of the document content area */
  static readonly documentWidth = "46em";

  /** Gutter width for the document (for decorations, etc) */
  static readonly documentGutter = "88px";
}
