import type MarkdownIt from "markdown-it";
import type StateBlock from "markdown-it/lib/rules_block/state_block.mjs";

/**
 * Matches a line that consists solely of a table-of-contents directive, e.g.
 * `[toc]`, `[[toc]]`, or `[[_TOC_]]` (case-insensitive). Mirrors the syntaxes
 * used by GitLab, MkDocs and other markdown flavors.
 */
const TOC_REGEX = /^(\[toc\]|\[\[_?toc_?\]\])$/i;

function tocRule(
  state: StateBlock,
  startLine: number,
  _endLine: number,
  silent: boolean
): boolean {
  const pos = state.bMarks[startLine] + state.tShift[startLine];
  const max = state.eMarks[startLine];
  const line = state.src.slice(pos, max).trim();

  if (!TOC_REGEX.test(line)) {
    return false;
  }

  if (silent) {
    return true;
  }

  state.line = startLine + 1;

  const token = state.push("toc", "div", 0);
  token.block = true;
  token.map = [startLine, state.line];
  token.markup = line;

  return true;
}

/**
 * A markdown-it plugin that converts a standalone `[toc]` directive into a
 * `toc` block token rendered as a live table of contents.
 *
 * @param md The markdown-it instance.
 */
export default function toc(md: MarkdownIt) {
  md.block.ruler.before("paragraph", "toc", tocRule, {
    alt: ["paragraph", "reference", "blockquote", "list"],
  });
}
