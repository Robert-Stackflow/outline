import type MarkdownIt from "markdown-it";
import type StateBlock from "markdown-it/lib/rules_block/state_block.mjs";
import { yamlToObject } from "@shared/utils/frontmatter";

/**
 * A markdown-it rule that consumes leading YAML frontmatter (delimited by
 * `---`) so it does not render as document content. Server-side imports parse
 * this block into document properties before markdown reaches ProseMirror.
 *
 * @param md the markdown-it instance to extend.
 */
export default function frontmatter(md: MarkdownIt): void {
  function rule(
    state: StateBlock,
    startLine: number,
    endLine: number,
    silent: boolean
  ): boolean {
    // Frontmatter must be the very first block of the document.
    if (startLine !== 0) {
      return false;
    }

    const open = state.bMarks[startLine] + state.tShift[startLine];
    const openMax = state.eMarks[startLine];
    if (state.src.slice(open, openMax).trim() !== "---") {
      return false;
    }

    // Find the closing delimiter line ("---" or "...").
    let nextLine = startLine + 1;
    let found = false;
    for (; nextLine < endLine; nextLine++) {
      const pos = state.bMarks[nextLine] + state.tShift[nextLine];
      const lineMax = state.eMarks[nextLine];
      const line = state.src.slice(pos, lineMax).trim();
      if (line === "---" || line === "...") {
        found = true;
        break;
      }
    }

    if (!found) {
      return false;
    }

    const content = state.getLines(startLine + 1, nextLine, 0, false);
    if (yamlToObject(content) === null) {
      return false;
    }

    if (silent) {
      return true;
    }

    state.line = nextLine + 1;
    return true;
  }

  md.block.ruler.before("hr", "frontmatter", rule, {
    alt: ["paragraph", "reference", "blockquote", "list"],
  });
}
