import {
  getFloatingToolbarHorizontalPosition,
  getTopSelectionLineBounds,
} from "./floatingToolbarPosition";

describe("FloatingToolbar", () => {
  describe("getTopSelectionLineBounds", () => {
    it("anchors multiline selections to the first selected visual line", () => {
      const bounds = getTopSelectionLineBounds([
        new DOMRect(200, 80, 360, 20),
        new DOMRect(40, 112, 980, 20),
        new DOMRect(180, 144, 160, 20),
      ]);

      expect(bounds).toEqual({
        bottom: 100,
        height: 20,
        left: 200,
        right: 560,
        top: 80,
        width: 360,
      });
    });

    it("merges fragmented rects on the first selected visual line", () => {
      const bounds = getTopSelectionLineBounds([
        new DOMRect(200, 80, 120, 20),
        new DOMRect(340, 81, 160, 19),
        new DOMRect(40, 112, 980, 20),
      ]);

      expect(bounds).toEqual({
        bottom: 100,
        height: 20,
        left: 200,
        right: 500,
        top: 80,
        width: 300,
      });
    });
  });

  describe("getFloatingToolbarHorizontalPosition", () => {
    it("waits for the toolbar width to be measured before showing it", () => {
      const position = getFloatingToolbarHorizontalPosition({
        align: "center",
        margin: 12,
        menuWidth: 0,
        offsetParent: {
          left: 260,
          width: 748,
          x: 260,
        },
        selectionBounds: {
          left: 400,
          right: 600,
        },
        viewportWidth: 1280,
      });

      expect(position).toBeUndefined();
    });

    it("centers a measured toolbar over the selected text", () => {
      const position = getFloatingToolbarHorizontalPosition({
        align: "center",
        margin: 12,
        menuWidth: 360,
        offsetParent: {
          left: 260,
          width: 748,
          x: 260,
        },
        selectionBounds: {
          left: 400,
          right: 600,
        },
        viewportWidth: 1280,
      });

      expect(position).toEqual({
        left: 60,
        maxWidth: 724,
        offset: 0,
      });
    });
  });
});
