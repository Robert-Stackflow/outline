export interface SelectionLineBounds {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
}

export interface FloatingToolbarHorizontalPosition {
  left: number;
  maxWidth: number;
  offset: number;
}

interface FloatingToolbarBounds {
  left: number;
  right: number;
}

interface FloatingToolbarOffsetParent {
  left: number;
  width: number;
  x: number;
}

interface GetFloatingToolbarHorizontalPositionOptions {
  align: "start" | "end" | "center";
  margin: number;
  menuWidth: number;
  offsetParent: FloatingToolbarOffsetParent;
  selectionBounds: FloatingToolbarBounds;
  viewportWidth: number;
}

const lineTopTolerance = 2;

/**
 * Gets the combined bounds for the first visual line in a text selection.
 *
 * @param rects - client rects from the current browser selection range.
 * @returns bounds for the top selected visual line.
 */
export function getTopSelectionLineBounds(
  rects: readonly DOMRect[]
): SelectionLineBounds | undefined {
  const visibleRects = rects.filter(
    (rect) => rect.width > 0 && rect.height > 0
  );

  if (!visibleRects.length) {
    return undefined;
  }

  const top = Math.min(...visibleRects.map((rect) => rect.top));
  const topLineRects = visibleRects.filter(
    (rect) => Math.abs(rect.top - top) <= lineTopTolerance
  );

  const bottom = Math.max(...topLineRects.map((rect) => rect.bottom));
  const left = Math.min(...topLineRects.map((rect) => rect.left));
  const right = Math.max(...topLineRects.map((rect) => rect.right));

  return {
    bottom,
    height: bottom - top,
    left,
    right,
    top,
    width: right - left,
  };
}

/**
 * Calculates the horizontal toolbar position relative to the portal parent.
 *
 * @param options - toolbar dimensions, selection bounds, and viewport limits.
 * @returns the horizontal position, or undefined until the toolbar is measured.
 */
export function getFloatingToolbarHorizontalPosition({
  align,
  margin,
  menuWidth,
  offsetParent,
  selectionBounds,
  viewportWidth,
}: GetFloatingToolbarHorizontalPositionOptions):
  | FloatingToolbarHorizontalPosition
  | undefined {
  if (menuWidth <= 0) {
    return undefined;
  }

  const halfSelection =
    Math.abs(selectionBounds.right - selectionBounds.left) / 2;
  const centerOfSelection = selectionBounds.left + halfSelection;
  const centeredLeft = centerOfSelection - menuWidth / 2;
  const anchoredLeft =
    align === "center"
      ? centeredLeft
      : align === "start"
        ? selectionBounds.left
        : selectionBounds.right;

  const left = Math.min(
    Math.min(
      offsetParent.x + offsetParent.width - menuWidth - margin,
      viewportWidth - margin
    ),
    Math.max(Math.max(offsetParent.x, margin), anchoredLeft)
  );
  const offset = left - centeredLeft;

  return {
    left: Math.max(margin, Math.round(left - offsetParent.left)),
    maxWidth: Math.min(viewportWidth, offsetParent.width) - margin * 2,
    offset: Math.round(offset),
  };
}
