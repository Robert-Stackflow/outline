import type MarkdownIt from "markdown-it";
import type StateBlock from "markdown-it/lib/rules_block/state_block.mjs";

/**
 * A markdown-it rule that converts leading YAML frontmatter (delimited by `---`)
 * into a fenced `yaml` code block so it renders as a code block instead of a
 * horizontal rule followed by loose text.
 *
 * Mirrors the server-side behavior in DocumentConverter.processFrontmatter so
 * that pasted and imported markdown render consistently.
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

    if (silent) {
      return true;
    }

    const content = state.getLines(startLine + 1, nextLine, 0, false);

    const token = state.push("fence", "code", 0);
    token.info = "yaml";
    token.content = content;
    token.markup = "```";
    token.map = [startLine, nextLine + 1];

    state.line = nextLine + 1;
    return true;
  }

  md.block.ruler.before("hr", "frontmatter", rule, {
    alt: ["paragraph", "reference", "blockquote", "list"],
  });
}
