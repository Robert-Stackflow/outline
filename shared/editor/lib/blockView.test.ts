import { describe, expect, it } from "vitest";
import { shouldIgnoreBlockViewMutation } from "./blockView";

describe.skipIf(typeof document === "undefined")("blockView", () => {
  it("does not ignore selection mutations outside editable content", () => {
    const root = document.createElement("div");
    const chrome = document.createElement("span");
    const content = document.createElement("p");

    root.appendChild(chrome);
    root.appendChild(content);

    const mutation = {
      type: "selection",
      target: root,
    } as MutationRecord;

    expect(shouldIgnoreBlockViewMutation(content, mutation)).toBe(false);
  });
});
