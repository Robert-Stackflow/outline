import { createGlobalStyle } from "styled-components";
import { transparentize } from "polished";
import styledNormalize from "styled-normalize";
import { breakpoints, depths, s } from ".";
import { EditorStyleHelper } from "../editor/styles/EditorStyleHelper";

type Props = {
  staticHTML?: boolean;
  useCursorPointer?: boolean;
};

export default createGlobalStyle<Props>`
  ${styledNormalize}

  * {
    box-sizing: border-box;
  }

  /* Subtle, borderless scrollbars across the app — no track background, no border */
  * {
    scrollbar-width: thin;
    scrollbar-color: ${(props) => props.theme.scrollbarThumb} transparent;
  }

  ::-webkit-scrollbar {
    width: 12px;
    height: 12px;
    background: transparent;
  }

  ::-webkit-scrollbar-track,
  ::-webkit-scrollbar-corner {
    background: transparent;
    border: 0;
  }

  ::-webkit-scrollbar-thumb {
    background-color: ${(props) => props.theme.scrollbarThumb};
    border: 3px solid transparent;
    border-radius: 8px;
    background-clip: padding-box;
  }

  ::-webkit-scrollbar-thumb:hover {
    background-color: ${(props) => props.theme.textTertiary};
  }

  /* lucide icons are stroke-based — keep them outline-only so legacy fill-based
     hover/selected styles (e.g. menu items) don't fill the glyph solid.
     Color follows currentColor via stroke. vertical-align keeps them centered
     against adjacent text in inline/baseline contexts. */
  svg.lucide {
    fill: none !important;
    vertical-align: middle;
  }

  html {
    --line-height-body: 1.6;
    --font-size-body: 16px;
  }

  /* Per-document display preferences applied via data attributes on the
     document scene container. Math (KaTeX) and code blocks keep their
     canonical fonts regardless of the document font choice. The
     .document-title selector covers the page heading rendered by
     ContentEditable above the editor body. Scoping to the container avoids
     the cross-document jump that happens when attributes live on <html>. */

  .ProseMirror {
    padding: 0px !important;
    margin: 0px !important;
  }

  [data-document-display][data-smaller-text="true"] .ProseMirror {
    font-size: 14px;
  }

  [data-document-display][data-font-family="serif"] .document-title,
  [data-document-display][data-font-family="serif"] .ProseMirror,
  [data-document-display][data-font-family="serif"]
    .ProseMirror
    *:not(.katex):not(.katex *):not(.math-node):not(.math-node *):not(code):not(pre):not(pre *) {
    font-family: Georgia, "Times New Roman", "Songti SC", serif;
  }

  [data-document-display][data-font-family="mono"] .document-title,
  [data-document-display][data-font-family="mono"] .ProseMirror,
  [data-document-display][data-font-family="mono"]
    .ProseMirror
    *:not(.katex):not(.katex *):not(.math-node):not(.math-node *):not(code):not(pre):not(pre *) {
    font-family: ${s("fontFamilyMono")};
  }

  /* Lock mode disables editing affordances and applies a subtle read-only cue. */
  [data-document-display][data-document-locked="true"] .ProseMirror {
    cursor: default;
  }
  [data-document-display][data-document-locked="true"]
    .ProseMirror
    [contenteditable="true"] {
    pointer-events: none;
  }

  /* Disable drag handles in any read-only context (lock or reading mode) so
     content blocks cannot be reordered while the editor is locked. */
  [data-document-display][data-document-locked="true"] .ProseMirror [draggable="true"],
  body[data-reading-mode="true"] .ProseMirror [draggable="true"] {
    -webkit-user-drag: none;
    user-drag: none;
  }
  [data-document-display][data-document-locked="true"] .ProseMirror li::before,
  [data-document-display][data-document-locked="true"]
    .ProseMirror
    li[draggable="true"]::before,
  body[data-reading-mode="true"] .ProseMirror li::before,
  body[data-reading-mode="true"] .ProseMirror li[draggable="true"]::before {
    display: none !important;
  }

  /* Reading mode (transient): collapses surrounding chrome (header + meta)
     for an immersive read. Both height and opacity transition so the layout
     adjusts smoothly without lingering blank space. The sidebar collapse is
     handled separately by toggleCollapsedSidebar(). */
  [data-page-header] {
    max-height: 120px;
    overflow: hidden;
    will-change: max-height, opacity, transform;
    transition:
      max-height 300ms cubic-bezier(0.4, 0, 0.2, 1),
      min-height 300ms cubic-bezier(0.4, 0, 0.2, 1),
      padding 300ms cubic-bezier(0.4, 0, 0.2, 1),
      opacity 220ms ease,
      transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  .document-meta-line {
    max-height: 60px;
    overflow: hidden;
    transition:
      max-height 280ms cubic-bezier(0.4, 0, 0.2, 1),
      opacity 220ms ease,
      margin 280ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  body[data-reading-mode="true"] [data-page-header] {
    max-height: 0;
    min-height: 0;
    padding-top: 0;
    padding-bottom: 0;
    opacity: 0;
    transform: translateY(-12px);
    pointer-events: none;
    border: 0;
  }

  body[data-reading-mode="true"] .document-meta-line {
    max-height: 0;
    opacity: 0;
    margin: 0;
    pointer-events: none;
  }

  html,
  body {
    width: 100%;
    ${(props) => (props.staticHTML ? "" : "height: 100%;")}
    margin: 0;
    padding: 0;
    print-color-adjust: exact;
    --pointer: ${(props) => (props.useCursorPointer ? "pointer" : "default")};
    --scrollbar-width: calc(100vw - 100cqw);
    overscroll-behavior-x: none;

    @media print {
      background: none !important;
    }

    --line-height-p: var(--line-height-body);
    --line-height-h: 1.25;
  }

  /* Text selection uses a translucent tint of the workspace accent color. */
  ::selection {
    background: ${(props) => transparentize(0.7, props.theme.accent)};
  }
  ::-moz-selection {
    background: ${(props) => transparentize(0.7, props.theme.accent)};
  }

  body,
  button,
  input,
  optgroup,
  select,
  textarea {
    font-family: ${s("fontFamily")};
  }

  body {
    font-size: var(--font-size-body);
    line-height: var(--line-height-body);
    color: ${s("text")};
    overscroll-behavior-y: none;
    -moz-osx-font-smoothing: grayscale;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;

    ${(props) => (props.staticHTML ? "" : "width: 100vw;")}
    overflow-x: hidden;
    padding-right: calc(0 - var(--removed-body-scroll-bar-size)) !important;
  }

  @media (min-width: ${breakpoints.tablet}px) {
    html,
    body {
      min-height: ${(props) => (props.staticHTML ? "0" : "100vh")};
    }
  }

  @media (min-width: ${breakpoints.tablet}px) and (display-mode: standalone) {
    body:after {
      content: "";
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: ${(props) => props.theme.titleBarDivider};
      z-index: ${depths.titleBarDivider};
    }
  }

  a {
    color: ${(props) => props.theme.link};
    text-decoration: none;
    cursor: pointer;
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-weight: 500;
    line-height: var(--line-height-h);
    margin-top: 1em;
    margin-bottom: 0.5em;
  }
  h1 { font-size: 36px; }
  h2 { font-size: 26px; }
  h3 { font-size: 20px; }
  h4 { font-size: 18px; }
  h5 { font-size: 16px; }

  p,
  dl,
  ol,
  ul,
  pre,
  blockquote {
    margin-top: 1em;
    margin-bottom: 1em;
  }

  hr {
    border: 0;
    height: 0;
    border-top: 1px solid ${s("divider")};
  }

  :focus-visible {
    outline-color: ${s("accent")};
    outline-offset: -1px;
    outline-width: initial;
  }

  :root {
    --sat: env(safe-area-inset-top);
    --sar: env(safe-area-inset-right);
    --sab: env(safe-area-inset-bottom);
    --sal: env(safe-area-inset-left);
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

  /* Mermaid.js injects these into the root of the page. It's very annoying, but we have to deal with it or they affect layout */
  [id^="doffscreen-mermaid"] {
      position: absolute !important;
      left: -9999px !important;
      top: -9999px !important;
  }

  /* Table row/column drag and drop cursor */
  &.${EditorStyleHelper.tableDragging},
  &.${EditorStyleHelper.tableDragging} *,
  &.${EditorStyleHelper.tableDragging} *::before,
  &.${EditorStyleHelper.tableDragging} *::after {
    cursor: grabbing !important;
  }

  /* Image/media resize drag cursor */
  &.${EditorStyleHelper.resizeDragging},
  &.${EditorStyleHelper.resizeDragging} *,
  &.${EditorStyleHelper.resizeDragging} *::before,
  &.${EditorStyleHelper.resizeDragging} *::after {
    cursor: var(--resize-drag-cursor) !important;
  }
`;
