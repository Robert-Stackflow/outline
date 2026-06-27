/* oxlint-disable no-irregular-whitespace */
import { lighten, transparentize } from "polished";
import type { DefaultTheme } from "styled-components";
import styled, { css, keyframes } from "styled-components";
import { breakpoints, hover } from "../../styles";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import { videoStyle } from "./Video";

export type Props = {
  $rtl: boolean;
  readOnly?: boolean;
  readOnlyWriteCheckboxes?: boolean;
  commenting?: boolean;
  staticHTML?: boolean;
  editorStyle?: React.CSSProperties;
  grow?: boolean;
  theme: DefaultTheme;
  userId?: string;
};

export const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export const pulse = (color: string) => keyframes`
  0% { box-shadow: 0 0 0 1px ${color} }
  50% { box-shadow: 0 0 0 4px ${color} }
  100% { box-shadow: 0 0 0 1px ${color} }
`;

const codeMarkCursor = () => css`
  /* Based on https://github.com/curvenote/editor/blob/main/packages/prosemirror-codemark/src/codemark.css */
  .no-cursor {
    caret-color: transparent;
  }

  div:focus .fake-cursor,
  span:focus .fake-cursor {
    margin-right: -1px;
    border-left-width: 1px;
    border-left-style: solid;
    animation: ProseMirror-cursor-blink 1.1s steps(2, start) infinite;
    position: relative;
    z-index: 1;
  }
`;

const mathStyle = (props: Props) => css`
  /* Based on https://github.com/benrbray/prosemirror-math/blob/master/style/math.css */

  .math-node {
    min-width: 1em;
    min-height: 1em;
    font-family: ${props.theme.fontFamilyMono};
    cursor: auto;
    white-space: pre-wrap;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: thin;
    scrollbar-color: ${props.theme.scrollbarThumb} transparent;
  }

  math-block.math-fit,
  math-display.math-fit {
    overflow-x: clip;
    scrollbar-width: none;
  }

  math-block.math-fit::-webkit-scrollbar,
  math-display.math-fit::-webkit-scrollbar {
    display: none;
  }

  math-block.math-fit .math-render,
  math-display.math-fit .math-render {
    display: flex;
    justify-content: center;
    overflow: hidden;
    width: 100%;
  }

  .math-node::-webkit-scrollbar {
    height: 6px;
  }

  .math-node::-webkit-scrollbar-track {
    background: transparent;
  }

  .math-node::-webkit-scrollbar-thumb {
    background: ${props.theme.scrollbarThumb};
    border-radius: 3px;
  }

  .math-node.empty-math .math-render::before {
    content: "Empty math";
    color: ${props.theme.placeholder};
    font-size: 14px;
  }

  .math-node .math-render.parse-error::before {
    content: "(math error)";
    color: ${props.theme.brand.red};
    cursor: help;
  }

  .math-node.ProseMirror-selectednode {
    outline: none;
  }

  .math-node .math-src {
    display: none;
    color: ${props.theme.codeStatement};
    tab-size: 4;

    .ProseMirror-focused {
      outline: none;
    }
  }

  .math-node.ProseMirror-selectednode .math-src {
    display: inline;
  }

  .math-node.ProseMirror-selectednode .math-render {
    display: none;
  }

  math-inline {
    display: inline;
    white-space: nowrap;
  }

  math-inline .math-render {
    display: inline-block;
  }

  math-inline .math-src .ProseMirror {
    display: inline;
    margin: 0px 3px;
  }

  /* Background edit box for inline math while selected/editing.
     Block math gets its box from math-display.ProseMirror-selectednode below. */
  math-inline.ProseMirror-selectednode .math-src {
    background: ${props.theme.codeBackground};
    border-radius: 4px;
    padding: 1px 5px;
    outline: 1px solid ${props.theme.divider};
  }

  math-block,
  math-display {
    display: block;
  }

  /* Higher specificity than ".ProseMirror > *" so the block-math margin wins */
  .ProseMirror math-block,
  .ProseMirror math-display {
    margin: 1.4em 0;
  }

  math-block .math-render,
  math-display .math-render {
    display: block;
  }

  math-block.ProseMirror-selectednode,
  math-block.empty-math,
  math-display.ProseMirror-selectednode,
  math-display.empty-math {
    border-radius: 6px;
    border: 1px solid ${props.theme.divider};
    background: ${props.theme.codeBackground};
    padding: 0.6em 1em;
    font-family: ${props.theme.fontFamilyMono};
    font-size: 90%;
  }

  math-block.empty-math,
  math-display.empty-math {
    text-align: center;
  }

  math-block .math-src .ProseMirror,
  math-display .math-src .ProseMirror {
    width: 100%;
    display: block;
    outline: none;
  }

  math-block .katex-display,
  math-display .katex-display {
    margin: 0.25em 0;
  }

  .katex-html *::selection {
    background-color: none !important;
  }

  .math-node.math-select .math-render {
    background-color: #c0c0c0ff;
  }

  math-inline.math-select .math-render {
    padding-top: 2px;
  }
`;

const codeBlockStyle = (props: Props) => css`
  .token.comment,
  .token.prolog,
  .token.doctype,
  .token.cdata {
    color: ${props.theme.codeComment};
  }

  .token.punctuation {
    color: ${props.theme.codePunctuation};
  }

  .token.namespace {
    opacity: 0.7;
  }

  .token.boolean,
  .token.number {
    color: ${props.theme.codeNumber};
  }

  .token.property,
  .token.variable {
    color: ${props.theme.codeProperty};
  }

  .token.tag {
    color: ${props.theme.codeTag};
  }

  .token.char,
  .token.builtin,
  .token.string {
    color: ${props.theme.codeString};
  }

  .token.selector {
    color: ${props.theme.codeSelector};
  }

  .token.attr-name {
    color: ${props.theme.codeAttrName};
  }

  .token.attr-value,
  .token.attr-value .token.punctuation {
    color: ${props.theme.codeAttrValue};
  }

  .token.operator {
    color: ${props.theme.codeOperator};
  }

  .token.namespace {
    opacity: 0.8;
  }

  .token.entity,
  .token.url,
  .language-css .token.string,
  .style .token.string {
    color: ${props.theme.codeEntity};
  }

  .token.attr-value,
  .token.keyword,
  .token.control,
  .token.directive,
  .token.unit {
    color: ${props.theme.codeKeyword};
  }

  .token.function,
  .token.class-name-definition {
    color: ${props.theme.codeFunction};
  }

  .token.class-name {
    color: ${props.theme.codeClassName};
  }

  .token.statement,
  .token.regex,
  .token.atrule {
    color: ${props.theme.codeStatement};
  }

  .token.placeholder,
  .token.variable {
    color: ${props.theme.codePlaceholder};
  }

  .token.deleted {
    color: ${props.theme.textDiffDeleted};
    background-color: ${props.theme.textDiffDeletedBackground};
  }

  .token.inserted {
    color: ${props.theme.textDiffInserted};
    background-color: ${props.theme.textDiffInsertedBackground};
    text-decoration: none;
  }

  .token.italic {
    font-style: italic;
  }

  .token.important,
  .token.bold {
    font-weight: bold;
  }

  .token.constant {
    color: ${props.theme.codeConstant};
  }

  .token.parameter {
    color: ${props.theme.codeParameter};
  }

  .token.important {
    color: ${props.theme.codeImportant};
  }

  .token.entity {
    cursor: help;
  }
`;

const diffStyle = (props: Props) => css`
  .${EditorStyleHelper.diffNodeInsertion},
    .${EditorStyleHelper.diffInsertion}:not([class^="component-"]),
  .${EditorStyleHelper.diffInsertion} > * {
    color: ${props.theme.textDiffInserted};
    background-color: ${props.theme.textDiffInsertedBackground};
    text-decoration: none;

    &.${EditorStyleHelper.diffCurrentChange} {
      outline-color: ${lighten(0.2, props.theme.textDiffInserted)};
      background-color: ${lighten(0.2, props.theme.textDiffInsertedBackground)};
      animation: ${pulse(lighten(0.2, props.theme.textDiffInsertedBackground))}
        150ms 1;
    }
  }

  .${EditorStyleHelper.diffNodeInsertion} {
    &[class*="component-"] {
      outline: 4px solid ${props.theme.textDiffInsertedBackground};
    }

    td,
    th {
      border-color: ${props.theme.textDiffInsertedBackground};
    }
  }

  .${EditorStyleHelper.diffNodeInsertion}[class*="component-"],
    .${EditorStyleHelper.diffNodeInsertion}.math-node,
    ul.${EditorStyleHelper.diffNodeInsertion},
    li.${EditorStyleHelper.diffNodeInsertion} {
    border-radius: ${EditorStyleHelper.blockRadius};
  }

  td.${EditorStyleHelper.diffNodeInsertion},
    th.${EditorStyleHelper.diffNodeInsertion} {
    border-color: ${props.theme.textDiffInsertedBackground};
  }

  .${EditorStyleHelper.diffNodeDeletion},
    .${EditorStyleHelper.diffDeletion}:not([class^="component-"]),
  .${EditorStyleHelper.diffDeletion} > * {
    color: ${props.theme.textDiffDeleted};
    background-color: ${props.theme.textDiffDeletedBackground};
    text-decoration: line-through;

    &.${EditorStyleHelper.diffCurrentChange} {
      outline-color: ${lighten(0.2, props.theme.textDiffDeletedBackground)};
      background-color: ${lighten(0.2, props.theme.textDiffDeletedBackground)};
      animation: ${pulse(lighten(0.2, props.theme.textDiffDeletedBackground))}
        150ms 1;
    }
  }

  .${EditorStyleHelper.diffNodeDeletion} {
    &[class*="component-"] {
      outline: 4px solid ${props.theme.textDiffDeletedBackground};
    }

    .mention {
      background-color: ${props.theme.textDiffDeletedBackground};
    }

    td,
    th {
      border-color: ${props.theme.textDiffDeletedBackground};
    }
  }

  .${EditorStyleHelper.diffNodeDeletion}[class*="component-"],
    .${EditorStyleHelper.diffNodeDeletion}.math-node,
    ul.${EditorStyleHelper.diffNodeDeletion},
    li.${EditorStyleHelper.diffNodeDeletion} {
    border-radius: ${EditorStyleHelper.blockRadius};
  }

  td.${EditorStyleHelper.diffNodeDeletion},
    th.${EditorStyleHelper.diffNodeDeletion} {
    border-color: ${props.theme.textDiffDeletedBackground};
  }

  .${EditorStyleHelper.diffNodeModification},
    .${EditorStyleHelper.diffModification}:not([class^="component-"]),
  .${EditorStyleHelper.diffModification} > * {
    color: ${props.theme.text};
    background-color: ${transparentize(0.7, "#FFA500")};
    text-decoration: none;

    &.${EditorStyleHelper.diffCurrentChange} {
      outline-color: ${lighten(0.1, "#FFA500")};
      background-color: ${transparentize(0.5, "#FFA500")};
      animation: ${pulse(transparentize(0.5, "#FFA500"))} 150ms 1;
    }
  }

  .${EditorStyleHelper.diffNodeModification} {
    background-color: ${transparentize(0.7, "#FFA500")};

    &[class*="component-"] {
      outline: 4px solid ${transparentize(0.5, "#FFA500")};
    }

    td,
    th {
      border-color: ${transparentize(0.5, "#FFA500")};
    }
  }

  .${EditorStyleHelper.diffNodeModification}[class*="component-"],
    .${EditorStyleHelper.diffNodeModification}.math-node,
    ul.${EditorStyleHelper.diffNodeModification},
    li.${EditorStyleHelper.diffNodeModification} {
    border-radius: ${EditorStyleHelper.blockRadius};
  }

  td.${EditorStyleHelper.diffNodeModification},
    th.${EditorStyleHelper.diffNodeModification} {
    border-color: ${transparentize(0.5, "#FFA500")};
  }
`;

const findAndReplaceStyle = (props: Props) => css`
  & ::highlight(search-results) {
    background-color: rgba(255, 213, 0, 0.25);
  }

  & ::highlight(search-results-current) {
    background-color: rgba(255, 213, 0, 0.75);
    color: ${props.theme.textHighlightForeground};
  }

  .find-result:not(:has(.mention)),
  .find-result .mention {
    background: rgba(255, 213, 0, 0.25);
  }

  .find-result.current-result:not(:has(.mention)),
  .find-result.current-result .mention {
    background: rgba(255, 213, 0, 0.75);
    animation: ${pulse("rgba(255, 213, 0, 0.75)")} 150ms 1;
    color: ${props.theme.textHighlightForeground};
  }
`;

const emailStyle = (props: Props) => css`
  .attachment {
    display: block;
    color: ${props.theme.text} !important;
    box-shadow: 0 0 0 1px ${props.theme.divider};
    white-space: nowrap;
    border-radius: 8px;
    padding: 6px 8px;
  }
  .image > img {
    width: auto;
    height: auto;
  }
`;

/**
 * Adjustments to line-height and paragraph margins for complex scripts. If adding
 * scripts here you also need to update the `getLangFor` method.
 *
 * @returns The CSS styles for complex scripts.
 */
const textStyle = () => css`
  /* Southeast Asian scripts */
  :lang(th),  /* Thai */
    :lang(lo),  /* Lao */
    :lang(km),  /* Khmer */
    :lang(my) {
    /* Burmese */
    p {
      line-height: 1.7;
    }

    .ProseMirror > p {
      margin-top: 0.8em;
      margin-bottom: 0.8em;
    }
  }

  /* South Asian scripts */
  :lang(hi),  /* Hindi */
    :lang(mr),  /* Marathi */
    :lang(ne),  /* Nepali */
    :lang(bn),  /* Bengali */
    :lang(gu),  /* Gujarati */
    :lang(pa),  /* Punjabi */
    :lang(te),  /* Telugu */
    :lang(ta),  /* Tamil */
    :lang(ml),  /* Malayalam */
    :lang(si) {
    /* Sinhala */
    p {
      line-height: 1.7;
    }

    .ProseMirror > p {
      margin-top: 0.8em;
      margin-bottom: 0.8em;
    }
  }

  /* Tibetan and related scripts */
  :lang(bo) {
    p {
      line-height: 1.8;
    }

    .ProseMirror > p {
      margin-top: 0.8em;
      margin-bottom: 0.8em;
    }
  }

  /* Middle Eastern scripts */
  :lang(ar),  /* Arabic */
    :lang(fa),  /* Persian */
    :lang(ur),  /* Urdu */
    :lang(he) {
    /* Hebrew */
    p {
      line-height: 1.6;
    }
  }

  /* Ethiopic and other complex scripts */
  :lang(am),  /* Amharic */
    :lang(mn) {
    /* Mongolian */
    p {
      line-height: 1.7;
    }

    .ProseMirror > p {
      margin-top: 0.8em;
      margin-bottom: 0.8em;
    }
  }
`;

const style = (props: Props) => css`
--font-size-p: var(--font-size-body);
--font-size-h1: 30px;
--font-size-h2: 24px;
--font-size-h3: 20px;
--font-size-h4: 17px;
--font-size-h5: 15px;
--font-size-h6: 14px;

flex-grow: ${props.grow ? 1 : 0};
justify-content: start;
color: ${props.theme.text};
font-family: ${props.theme.fontFamily};
font-weight: ${props.theme.fontWeightRegular};
font-size: 1em;
line-height: -0.011;
width: 100%;

.mention {
  background: ${props.theme.mentionBackground};
  border-radius: 8px;
  padding-top: 1px;
  padding-bottom: 1px;
  padding-left: 4px;
  padding-right: 6px;
  font-weight: 500;
  font-size: 0.9em;
  cursor: default;
  text-decoration: none !important;

  display: inline-flex;
  align-items: center;
  gap: 4px;
  vertical-align: bottom;

  &:${hover} {
    cursor: default;
    background: ${props.theme.mentionHoverBackground};
  }

  &[data-type="user"],
  &[data-type="group"] {
    gap: 0;
  }

  /* Date mentions are plain text, so they inherit the surrounding font weight
     (e.g. bold when placed inside a heading). */
  &[data-type="date"] {
    font-weight: inherit;
  }

  &.mention-user::before {
    content: "@";
  }

  &.mention-document::before {
    content: "+";
  }
}

> div {
  background: transparent;
}

& * {
  box-sizing: content-box;
}

& > .ProseMirror {
  position: relative;
  outline: none;
  word-wrap: break-word;
  white-space: pre-wrap;
  white-space: break-spaces;

  & > .${EditorStyleHelper.multiplayerCursor} {
    display: none;
  }

  & > * {
    margin-top: .8em;
    margin-bottom: .8em;

    &:last-child {
      margin-bottom: 0;
    }
  }

  & > :first-child,
  & > button:first-child + * {
    margin-top: 0 !important;
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    margin-top: 1.4em;
    margin-bottom: 0.4em;
    line-height: 1.3;
    font-weight: 600;
    letter-spacing: -0.01em;
    cursor: text;
    clear: both;

    & + p,
    // accounts for block insert trigger and other widgets between heading and paragraph
    & + .ProseMirror-widget + p {
      margin-top: 0.25em;
    }

    &:not(.placeholder) {
      &::before {
        display: none;
        font-family: ${props.theme.fontFamilyMono};
        color: ${props.theme.textSecondary};
        font-size: 13px;
        font-weight: 500;
        line-height: 0;
        margin-left: -24px;
        opacity: 0;
        width: 24px;
      }

      &:dir(rtl)::before {
        margin-left: 0;
        margin-right: -24px;
      }
    }

    &:hover {
      .heading-anchor {
        opacity: 0.75;

        &:hover {
          opacity: 1;
        }
      }
    }
  }

  // all of heading sizes are stepped down one from global styles, except h1
  // which is between h1 and h2
  h1 { font-size: var(--font-size-h1); }
  h2 { font-size: var(--font-size-h2); }
  h3 { font-size: var(--font-size-h3); }
  h4 { font-size: var(--font-size-h4); }
  h5 { font-size: var(--font-size-h5); }
  h6 { font-size: var(--font-size-h6); }

  h3 {
    margin-top: 1.85em;
    margin-bottom: 0.55em;
  }

  h4,
  h5,
  h6 {
    margin-top: 1.65em;
    margin-bottom: 0.5em;
  }

  .${EditorStyleHelper.multiplayerSelection} {
    transition: background-color 500ms ease-in-out;
  }

  .${EditorStyleHelper.multiplayerCursor} {
    position: relative;
    margin-left: -1px;
    margin-right: -1px;
    border-left: 1px solid black;
    border-right: 1px solid black;
    height: 1em;
    word-break: normal;
    user-select: none;

    &::after {
      content: "";
      display: block;
      position: absolute;
      left: -8px;
      right: -8px;
      top: 0;
      bottom: 0;
    }
    > div {
      opacity: 0;
      transition: opacity 100ms ease-in-out;
      position: absolute;
      top: -1.8em;
      font-size: 13px;
      background-color: rgb(250, 129, 0);
      font-style: normal;
      line-height: normal;
      user-select: none;
      white-space: nowrap;
      color: white;
      padding: 2px 6px;
      font-weight: 500;
      border-radius: 4px;
      pointer-events: none;
      left: -1px;
    }

    &:hover {
      > div {
        opacity: 1;
      }
    }
  }
}

&.show-cursor-names .${EditorStyleHelper.multiplayerCursor} > div {
  opacity: 1;
}

pre {
  white-space: pre-wrap;
}

li {
  position: relative;
}

iframe.embed {
  width: 100%;
  height: 400px;
  border: 1px solid ${props.theme.embedBorder};
  border-radius: ${EditorStyleHelper.blockRadius};
}

.image,
.video {
  line-height: 0;
  text-align: center;
  max-width: 100%;
  clear: both;
  position: relative;
  z-index: 1;
  margin-top: 1.4em;
  margin-bottom: 1.4em;

  img,
  video {
    pointer-events: ${props.readOnly ? "initial" : "none"};
    display: inline-block;
    max-width: 100%;
    border-radius: 6px;
  }

  video {
    pointer-events: initial;
    ${videoStyle}
  }

  .ProseMirror-selectednode img {
    pointer-events: initial;
  }
}

/* Softer, rounded selection ring for images/videos instead of a hard outline */
.image.ProseMirror-selectednode,
.video.ProseMirror-selectednode {
  outline: none;
}

.image.ProseMirror-selectednode img,
.video.ProseMirror-selectednode video {
  box-shadow: 0 0 0 2px ${props.theme.accent};
  border-radius: 6px;
}

.image.placeholder,
.video.placeholder {
  position: relative;
  background: ${props.theme.background};
  margin-bottom: calc(28px + 1.2em);

  img,
  video {
    opacity: 0.5;
  }

  video {
    border-radius: 8px;
  }
}

.file.placeholder {
  display: flex;
  align-items: center;
  background: ${props.theme.background};
  box-shadow: 0 0 0 1px ${props.theme.divider};
  white-space: nowrap;
  border-radius: 8px;
  padding: 6px 8px;
  max-width: 840px;
  cursor: default;

  margin-top: 0.5em;
  margin-bottom: 0.5em;

  .title,
  .subtitle {
    margin-left: 8px;
  }

  .title {
    font-weight: 600;
    font-size: 14px;
    color:  ${props.theme.text};
  }

  .subtitle {
    font-size: 13px;
    color: ${props.theme.textTertiary};
    line-height: 0;
  }

  span {
    font-family: ${props.theme.fontFamilyMono};
  }
}

.attachment-replacement-uploading {
  .widget {
    opacity: 0.5;
  }
}

.image-replacement-uploading {
  img {
    opacity: 0.5;
  }
}

.image-icon {
  display: inline-block;
  text-align: initial;
  clear: initial;
  vertical-align: text-bottom;

  .image-wrapper {
    margin: 0;
  }
}

.image-right-50 {
  float: right;
  margin-left: 2em;
  margin-bottom: 1em;
  clear: initial;
}

.image-left-50 {
  float: left;
  margin-right: 2em;
  margin-bottom: 1em;
  clear: initial;
}

.image-full-width {
  width: initial;
  max-width: 100vw;
  clear: both;
  position: initial;
  transform: translateX(calc(50% + var(--container-width) * -0.5 + var(--full-width-transform-offset)));

  img {
    max-width: 100vw;
    max-height: min(450px, 50vh);
    object-fit: cover;
    object-position: center;
  }
}

.${EditorStyleHelper.tableFullWidth} {
  transform: translateX(calc(50% + var(--container-width) * -0.5 + var(--full-width-transform-offset)));

  .${EditorStyleHelper.tableScrollable},
  table {
    width: var(--container-width);
  }
}

.column-resize-handle {
  ${props.readOnly ? "display: none;" : ""}
  position: absolute;
  right: -1px;
  top: 0;
  bottom: -1px;
  width: 3px;
  z-index: 20;
  background-color: ${props.theme.accent};
  pointer-events: none;
}

.resize-cursor {
  ${props.readOnly ? "pointer-events: none;" : ""}
  cursor: ew-resize;
  cursor: col-resize;
}

.ProseMirror-hideselection *::selection {
  background: transparent;
}
.ProseMirror-hideselection *::-moz-selection {
  background: transparent;
}
.ProseMirror-hideselection {
  caret-color: transparent;
}

.ProseMirror-selectednode {
  outline: 2px solid
    ${props.readOnly ? "transparent" : props.theme.selected};

  @media print {
    outline: none;
  }
}

/* Make sure li selections wrap around markers */

li.ProseMirror-selectednode {
  outline: none;
}

li.ProseMirror-selectednode {
  &::after {
    content: "";
    position: absolute;
    left: -32px;
    right: -2px;
    top: -2px;
    bottom: -2px;
    border: 2px solid ${props.theme.selected};
    pointer-events: none;
  }

  &:dir(rtl)::after {
    left: -2px;
    right: -32px;
  }
}

img.ProseMirror-separator {
  display: inline;
  border: none !important;
  margin: 0 !important;
}

.component-image {
  display: block;
}

.component-image:has(.image-icon) {
  display: inline-block;
  vertical-align: text-bottom;
}

.image-commented .image-wrapper {
  outline: ${props.theme.commentedImageOutlineLight} solid 2px;
}

// Removes forced paragraph spaces below images, this is needed to images
// being inline nodes that are displayed like blocks
.component-image + img.ProseMirror-separator,
.component-image + img.ProseMirror-separator + br.ProseMirror-trailingBreak {
  display: none;
}

.${EditorStyleHelper.imageCaption} {
  border: 0;
  display: block;
  font-style: normal;
  font-weight: normal;
  font-size: 13px;
  color: ${props.theme.textTertiary};
  padding: 10px 0 4px;
  line-height: 1.5;
  text-align: center;
  min-height: 1em;
  outline: none;
  background: none;
  resize: none;
  user-select: text;
  margin: 0 auto !important;
  width: 100%;
  max-width: 100vw;
}

.ProseMirror[contenteditable="false"] {
  .${EditorStyleHelper.imageCaption} {
    pointer-events: none;
  }
  .${EditorStyleHelper.imageCaption}:empty {
    visibility: hidden;
  }
}

.${EditorStyleHelper.headingPositionAnchor}, .${EditorStyleHelper.imagePositionAnchor} {
  color: ${props.theme.text};
  pointer-events: none;
  display: block;
  position: relative;
  top: -60px;
  visibility: hidden;

  &:hover {
    text-decoration: none;
  }
}

.${EditorStyleHelper.headingPositionAnchor}:first-child,
// Edge case where multiplayer cursor is between start of cell and heading
.${EditorStyleHelper.headingPositionAnchor}:first-child + .${EditorStyleHelper.multiplayerCursor},
// Edge case where table grips are between start of cell and heading
.${EditorStyleHelper.headingPositionAnchor}:first-child + [role=button] + [role=button] {
  & + h1,
  & + h2,
  & + h3,
  & + h4 {
    margin-top: 0;
  }
}

a:first-child {
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    margin-top: 0;
  }
}

h1:not(.placeholder)::before {
  content: "H1";
}
h2:not(.placeholder)::before {
  content: "H2";
}
h3:not(.placeholder)::before {
  content: "H3";
}
h4:not(.placeholder)::before {
  content: "H4";
}
h5:not(.placeholder)::before {
  content: "H5";
}
h6:not(.placeholder)::before {
  content: "H6";
}

.ProseMirror[contenteditable="true"]:focus-within,
.ProseMirror-focused {
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    &:not(.placeholder)::before {
      opacity: 0;
    }
    &:hover:not(.placeholder)::before {
      opacity: 0.5;
    }
  }
}

.ProseMirror[contenteditable="true"] {
  & .image-wrapper.ProseMirror-selectednode > a {
    /* force zoom-in cursor if image node is selected */
    cursor: zoom-in !important;
  }
  &.ProseMirror-focused {
    .image-wrapper:not(.ProseMirror-selectednode) > a {
      /* prevents cursor from turning to pointer on pointer down */
      pointer-events: none;
    }
  }
  &:not(.ProseMirror-focused) {
    .image-wrapper  {
      & > a[href] {
        cursor: pointer;
      }
      & > a:not([href]) {
        /* prevents cursor from turning to pointer on pointer down */
        pointer-events: none;
      }
    }
  }
}

.ProseMirror[contenteditable="false"] {
  .image-wrapper  {
    & > a[href] {
      cursor: pointer;
    }
    & > a:not([href]) {
      cursor: zoom-in;
    }
  }
}

.with-emoji {
  margin-${props.$rtl ? "right" : "left"}: -1em;
}

.emoji img {
  width: 1em;
  height: 1em;
  vertical-align: middle;
  position: relative;
  top: -0.1em;
}

.heading-anchor {
  display: none;
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  margin-left: -26px;
  width: 26px;
  align-items: center;
  justify-content: center;
  opacity: 0;
  user-select: none;
  color: ${props.theme.text};
  cursor: var(--pointer);
  background: none;
  outline: none;
  border: 0;
  padding: 0;
  font-weight: 500;
  font-family: ${props.theme.fontFamilyMono};
  font-size: 16px;
  line-height: 1;
  box-sizing: border-box;

  &:hover {
    opacity: 1;
  }

  &:dir(rtl) {
    margin-left: 0;
    margin-right: -26px;
  }
}

.ProseMirror > {
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    .heading-anchor {
      display: none;
    }
    &:not(.placeholder)::before {
      display: none;
    }
  }
}

.placeholder::before {
  display: block;
  opacity: 0;
  transition: opacity 150ms ease-in-out;
  content: ${props.readOnly ? "" : "attr(data-empty-text)"};
  pointer-events: none;
  height: 0;
  color: ${props.theme.placeholder};
}

/** Show the placeholder if focused or the first visible item nth(2) accounts for block insert trigger */
.ProseMirror-focused .placeholder::before,
.placeholder:nth-child(1)::before,
.placeholder:nth-child(2)::before {
  opacity: 1;
}

${
  props.commenting
    ? `
.${EditorStyleHelper.comment} {
  &:not([data-resolved]):not([data-draft]), &[data-draft][data-user-id="${
    props.userId ?? ""
  }"]  {
    text-decoration: underline 2px ${props.theme.commentMarkBackground};
    transition: background 100ms ease-in-out;

    &:hover {
      ${props.readOnly ? "cursor: var(--pointer);" : ""}
      background: ${props.theme.commentMarkBackground};

      * {
        background: transparent !important;
      }
    }
  }
}
`
    : `
.${EditorStyleHelper.comment} {
  background: transparent !important;
  border: none !important;
}
`
}

.notice-block {
  display: flex;
  align-items: center;
  background: ${transparentize(0.9, props.theme.noticeInfoBackground)};
  border-left: 4px solid ${props.theme.noticeInfoBackground};
  color: ${props.theme.noticeInfoText};
  border-radius: 4px;
  padding: 8px 10px 8px 8px;
  margin: 8px 0;

  a {
    color: ${props.theme.noticeInfoText};
    text-decoration: underline;
  }

  p:first-child {
    margin-top: 0;
  }

  p:last-child {
    margin-bottom: 0;
  }
}

.notice-block .content {
  flex-grow: 1;
  min-width: 0;
}

.notice-block {
  .icon {
    width: 24px;
    height: 24px;
    align-self: flex-start;
    margin-right: 4px;
    color: ${props.theme.noticeInfoBackground};
  }

  &:dir(rtl) .icon {
    margin-right: 0;
    margin-left: 4px;
  }
}

.notice-block.tip {
  background: ${transparentize(0.9, props.theme.noticeTipBackground)};
  border-left: 4px solid ${props.theme.noticeTipBackground};
  color: ${props.theme.noticeTipText};

  .icon {
    color: ${props.theme.noticeTipBackground};
  }

  a {
    color: ${props.theme.noticeTipText};
  }
}

.notice-block.warning {
  background: ${transparentize(0.9, props.theme.noticeWarningBackground)};
  border-left: 4px solid ${props.theme.noticeWarningBackground};
  color: ${props.theme.noticeWarningText};

  .icon {
    color: ${props.theme.noticeWarningBackground};
  }

  a {
    color: ${props.theme.noticeWarningText};
  }
}

.notice-block.success {
  background: ${transparentize(0.9, props.theme.noticeSuccessBackground)};
  border-left: 4px solid ${props.theme.noticeSuccessBackground};
  color: ${props.theme.noticeSuccessText};

  .icon {
    color: ${props.theme.noticeSuccessBackground};
  }

  a {
    color: ${props.theme.noticeSuccessText};
  }
}

blockquote {
  margin: 0;
  padding: 8px 10px 8px 1.5em;
  overflow: hidden;
  position: relative;

  &::before {
    content: "";
    display: inline-block;
    width: 2px;
    border-radius: 1px;
    position: absolute;
    margin-left: -1.5em;
    top: 0;
    bottom: 0;
    background: ${props.theme.quote};
  }

  &:dir(rtl)::before {
    margin-left: 0;
    margin-right: -1.5em;
  }
}

b,
strong {
  font-weight: 600;
}

.template-placeholder {
  color: ${props.theme.placeholder};
  border-bottom: 1px dotted ${props.theme.placeholder};
  border-radius: 2px;
  cursor: text;

  &:hover {
    border-bottom: 1px dotted
      ${props.readOnly ? props.theme.placeholder : props.theme.textSecondary};
  }
}

p {
  margin: 0;
  min-height: 1.6em;
}

.heading-content {
  position: relative;
}

.heading-content a,
p a {
  color: ${props.theme.text};
  text-decoration: underline;
  text-decoration-color: ${lighten(0.5, props.theme.text)};
  text-decoration-thickness: 1px;
  text-underline-offset: .15em;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
    text-decoration-color: ${props.theme.text};
    text-decoration-thickness: 1px;
  }
}

.heading-content a {
  font-weight: inherit;
}

a {
  color: ${props.theme.link};
  cursor: pointer;
}

.ProseMirror-focused {
  a {
    cursor: text;
  }
}

a:hover {
  text-decoration: ${props.readOnly ? "underline" : "none"};
}

ul,
ol {
  margin: 0 0.1em 0 ${props.staticHTML ? "0" : "-26px"};
  padding: 0 0 0 48px;

  &:has(p:dir(rtl)) {
    direction: rtl;
  }

  &:has(p:dir(rtl)),
  &:dir(rtl) {
    margin: 0 ${props.staticHTML ? "0" : "-26px"} 0 0.1em;
    padding: 0 48px 0 0;
  }
}

ol ol {
  list-style: lower-alpha;
}

ol ol ol {
  list-style: lower-roman;
}

ul li,
ol li {
  position: relative;
  white-space: initial;
  text-align: start;
  margin-top: 0.15em;
  margin-bottom: 0.15em;

  p {
    white-space: pre-wrap;
  }

  > div {
    width: 100%;
  }
}

/* Unordered list bullets: a slightly bolder dot with more breathing room
   between the marker and the text. */
ul:not(.checkbox_list) > li {
  padding-inline-start: 4px;

  &::marker {
    color: ${props.theme.text};
    font-size: 1.25em;
  }
}

.${EditorStyleHelper.checklistWrapper} {
  position: relative;
  margin: 1em 0;
}

li .${EditorStyleHelper.checklistWrapper} {
  position: static;
  margin: 0;
}

.${EditorStyleHelper.checklistCompletedToggle} {
  position: absolute;
  top: -8px;
  right: 0;
  padding: 4px 8px;
  font-size: 12px;
  background: ${props.theme.background};
  border: 1px solid ${props.theme.buttonNeutralBorder};
  border-radius: 6px;
  color: ${props.theme.textSecondary};
  cursor: var(--pointer);
  user-select: none;
  z-index: 1;
  opacity: 0;
  transition: all 100ms ease-in-out;

  &:${hover} {
    background: ${props.theme.buttonNeutralBackground};
    color: ${props.theme.text};
  }

  &:active {
    transform: scale(0.98);
  }
}

.${EditorStyleHelper.checklistWrapper}:${hover} .${EditorStyleHelper.checklistCompletedToggle},
.${EditorStyleHelper.checklistWrapper}:focus-within .${EditorStyleHelper.checklistCompletedToggle} {
  opacity: 1;
}

.${EditorStyleHelper.checklistWrapper}.${EditorStyleHelper.checklistCompletedHidden} .${EditorStyleHelper.checklistCompletedToggle} {
  opacity: 1;
}

td .${EditorStyleHelper.checklistCompletedToggle},
th .${EditorStyleHelper.checklistCompletedToggle} {
  top: -32px;
}

.${EditorStyleHelper.checklistWrapper}.${EditorStyleHelper.checklistCompletedHidden} ul.checkbox_list > li.checked {
  display: none;
}

ul.checkbox_list {
  padding: 0;
  margin-left: -24px;
  margin-right: 0;

  & > li {
    display: flex;
    list-style: none;
    padding-left: 24px;
    padding-right: 0;
  }

  &:has(p:dir(rtl)) {
    margin-left: 0;
    margin-right: -24px;

    & > li {
      padding-left: 0;
      padding-right: 24px;
    }
  }
}

ul.checkbox_list > li.checked > div > p {
  color: ${props.theme.textTertiary};
}

ul li.ProseMirror-selectednode::after,
ol li.ProseMirror-selectednode::after {
  display: none;
}

ul.checkbox_list {
  & > li > span[contenteditable="false"] {
    cursor: text;
  }

  .checkbox {
    display: inline-block;
    cursor: var(--pointer);
    pointer-events: ${
      props.readOnly && !props.readOnlyWriteCheckboxes ? "none" : "initial"
    };
    width: 14px;
    height: 14px;
    position: relative;
    top: 1px;
    transition: transform 100ms ease-in-out;
    opacity: .8;
    margin: 0 0.5em 0 0;

    &[aria-checked=true] {
      opacity: 1;
    }

    &:active {
      transform: scale(0.9);
    }

    svg {
      display: block;
      width: 14px;
      height: 14px;
      overflow: visible;
    }

    .checkbox-box {
      fill: ${props.theme.accent};
      fill-opacity: 0;
      stroke: ${props.theme.text};
      stroke-width: 2;
      transition: fill-opacity 100ms ease-in-out, stroke 100ms ease-in-out;
    }

    .checkbox-tick {
      fill: none;
      stroke: ${props.theme.accentText};
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-dasharray: 14;
      stroke-dashoffset: 14;
      transition: stroke-dashoffset 200ms ease-in-out;
    }

    &[aria-checked=true] {
      .checkbox-box {
        fill-opacity: 1;
        stroke: ${props.theme.accent};
      }
      .checkbox-tick {
        stroke-dashoffset: 0;
      }
    }

    /* Static fallback for environments without inline SVG (e.g. SSR) */
    &:not(:has(svg)) {
      background-image: ${`url("data:image/svg+xml,%3Csvg width='14' height='14' viewBox='0 0 14 14' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M3 0C1.34315 0 0 1.34315 0 3V11C0 12.6569 1.34315 14 3 14H11C12.6569 14 14 12.6569 14 11V3C14 1.34315 12.6569 0 11 0H3ZM3 2C2.44772 2 2 2.44772 2 3V11C2 11.5523 2.44772 12 3 12H11C11.5523 12 12 11.5523 12 11V3C12 2.44772 11.5523 2 11 2H3Z' fill='${props.theme.text.replace(
        /#/g,
        "%23",
      )}' /%3E%3C/svg%3E%0A");`}

      &[aria-checked=true] {
        background-image: ${`url(
            "data:image/svg+xml,%3Csvg width='14' height='14' viewBox='0 0 14 14' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M3 0C1.34315 0 0 1.34315 0 3V11C0 12.6569 1.34315 14 3 14H11C12.6569 14 14 12.6569 14 11V3C14 1.34315 12.6569 0 11 0H3ZM4.26825 5.85982L5.95873 7.88839L9.70003 2.9C10.0314 2.45817 10.6582 2.36863 11.1 2.7C11.5419 3.03137 11.6314 3.65817 11.3 4.1L6.80002 10.1C6.41275 10.6164 5.64501 10.636 5.2318 10.1402L2.7318 7.14018C2.37824 6.71591 2.43556 6.08534 2.85984 5.73178C3.28412 5.37821 3.91468 5.43554 4.26825 5.85982Z' fill='${props.theme.accent.replace(
              /#/g,
              "%23",
            )}' /%3E%3C/svg%3E%0A"
        )`};
      }
    }
  }

  &:has(p:dir(rtl)) {
    .checkbox {
      margin: 0 0 0 0.5em;
    }
  }
}

li p:first-child {
  margin: 0;
  word-break: break-word;
}

hr {
  position: relative;
  height: 1em;
  border: 0;
  clear: both;
}

hr::before {
  content: "";
  display: block;
  position: absolute;
  border-top: 1px solid ${props.theme.horizontalRule};
  top: 0.5em;
  left: 0;
  right: 0;
}

hr.page-break {
  page-break-after: always;
}

hr.page-break::before {
  border-top: 1px dashed ${props.theme.horizontalRule};
}

.math-inline .math-src .ProseMirror,
code {
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;

  border-radius: 4px;
  border: 0;
  background: ${props.theme.codeBackground};
  padding: 0.15em 0.4em;
  color: ${props.theme.code};
  font-family: ${props.theme.fontFamilyMono};
  font-size: 0.875em;

  &.inline {
    color: ${props.theme.codeKeyword};
  }

  .${EditorStyleHelper.codeWord} {
    @media (min-width: ${breakpoints.tablet}px) {
      white-space: nowrap;
    }
  }
}

.${EditorStyleHelper.hexColorSwatch} {
  display: inline-block;
  width: 0.75em;
  height: 0.75em;
  margin-left: 0.3em;
  vertical-align: -0.05em;
  border-radius: 50%;
  background-clip: padding-box;
  cursor: var(--pointer);
}

.${
  props.theme.isDark
    ? EditorStyleHelper.hexColorSwatchDark
    : EditorStyleHelper.hexColorSwatchLight
} {
  outline: 1px solid ${props.theme.codeBorder};
}

mark {
  border-radius: 1px;
  padding: 2px 0;
  color: ${props.theme.text};

  a {
    color: ${props.theme.text};
  }
}

.external-link {
  cursor: pointer;
  display: inline-block;
  position: relative;
  top: 2px;
  width: 16px;
  height: 16px;
}

.${EditorStyleHelper.codeBlock} {
  position: relative;
  font-size: 90%;

  &:hover + .${EditorStyleHelper.codeBlockToggle},
  &:focus-within + .${EditorStyleHelper.codeBlockToggle},
  & + .${EditorStyleHelper.codeBlockToggle}:hover,
  & + .${EditorStyleHelper.codeBlockToggle}:focus {
    opacity: 1;
  }
}

.${EditorStyleHelper.codeBlock}[data-language=none],
.${EditorStyleHelper.codeBlock}[data-language=markdown] {
  pre code {
    color: ${props.theme.text};
  }
}

.${EditorStyleHelper.codeBlock}[data-language=mermaid],
.${EditorStyleHelper.codeBlock}[data-language=mermaidjs] {
  ${
    !props.staticHTML &&
    css`
      pre {
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
        margin-bottom: -20px;
        overflow: hidden;
      }
    `
  }

  &:is(.code-active) + .mermaid-diagram-wrapper {
    cursor: zoom-in;
  }

  // Hide code without display none so toolbar can still be positioned against it
  &:not(.code-active) {
    height: ${props.staticHTML || props.readOnly ? "auto" : "0"};
    margin: 0.5em 0 -0.75em 0px;
    overflow: hidden;
    position: relative;
  }

  &.ProseMirror-selectednode {
    outline: none;

    & + .mermaid-diagram-wrapper {
      &:not(.empty) {
        cursor: zoom-in;
      }
      outline: 2px solid ${props.theme.selected};
    }
  }
}

.ProseMirror[contenteditable="false"] .${EditorStyleHelper.codeBlock}[data-language=mermaid],
.ProseMirror[contenteditable="false"] .${EditorStyleHelper.codeBlock}[data-language=mermaidjs] {
    height: 0;
    overflow: hidden;

    & + .mermaid-diagram-wrapper {
      cursor: zoom-in;
    }
}

.ProseMirror.exported {
    .${EditorStyleHelper.codeBlock}[data-language=mermaid],
    .${EditorStyleHelper.codeBlock}[data-language=mermaidjs] {
        height: auto;
        overflow: visible;

        &::after {
          display: none;
        }
    }

    .mermaid-diagram-wrapper {
        display: none;
    }
}

.${EditorStyleHelper.codeBlock}.with-line-wrap {
  pre {
    white-space: pre-wrap;
    word-break: break-all;
  }
}

.${EditorStyleHelper.codeBlock}.with-line-numbers {
  pre {
    padding-left: calc(var(--line-number-gutter-width, 0) * 1em + 1.5em);
  }

  &::after {
    content: attr(data-line-numbers);
    position: absolute;
    padding-left: 0.5em;
    left: 1px;
    top: 1em;
    width: calc(var(--line-number-gutter-width,0) * 1em + .25em);
    word-break: break-all;
    white-space: break-spaces;
    font-family: ${props.theme.fontFamilyMono};
    line-height: 1.5em;
    color: ${props.theme.textTertiary};
    background: ${props.theme.codeBackground};
    text-align: right;
    font-variant-numeric: tabular-nums;
    user-select: none;
  }
}

.${EditorStyleHelper.codeBlock}.collapsed {
  pre {
    pointer-events: none;
    max-height: calc(10 * 1.5em + 0.75em);
    overflow: hidden;
  }

  &::after {
    max-height: calc(10 * 1.5em + 0.75em);
    overflow: hidden;
    clip-path: inset(0 0 calc(100% - 10 * 1.5em - 0.75em) 0);
  }

  &::before {
    content: "";
    position: absolute;
    bottom: 1px;
    left: 1px;
    right: 1px;
    height: 120px;
    z-index: 1;
    pointer-events: none;
    border-radius: 0 0 4px 4px;
    background: linear-gradient(
      to bottom,
      ${transparentize(1, props.theme.codeBackground)} 0%,
      ${transparentize(0.2, props.theme.codeBackground)} 70%,
      ${props.theme.codeBackground} 100%
    );
  }

  @media print {
    pre {
      max-height: none;
      overflow: visible;
    }

    &::after {
      max-height: none;
      overflow: visible;
      clip-path: none;
    }

    &::before {
      display: none;
    }
  }
}

.${EditorStyleHelper.codeBlockToggle} {
  display: inline-flex;
  align-items: center;
  position: absolute;
  z-index: 2;
  left: 50%;
  transform: translate3d(-50%, -50px, 0);
  margin: 0;
  padding: 0 8px;
  border: 0;
  border-radius: 100px;
  background: ${props.theme.background};
  color: ${props.theme.buttonNeutralText};
  box-shadow: rgba(0, 0, 0, 0.07) 0px 1px 2px, ${props.theme.buttonNeutralBorder} 0 0 0 1px inset;
  font-size: 13px;
  font-weight: 500;
  height: 24px;
  cursor: var(--pointer);
  user-select: none;
  appearance: none !important;
  opacity: 0;
  transition: opacity 150ms ease;
  pointer-events: auto;

  &:hover {
    background: ${props.theme.backgroundSecondary};
  }

  @media print {
    display: none !important;
  }
}

.mermaid-diagram-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0.75em 0;
  min-height: 1.6em;
  background: ${props.theme.codeBackground};
  border-radius: ${EditorStyleHelper.blockRadius};
  border: 1px solid ${props.theme.codeBorder};
  padding: 8px;
  user-select: none;
  cursor: default;

  * {
    font-family: ${props.theme.fontFamily};
  }

  &.empty {
    font-family: ${props.theme.fontFamilyMono};
    font-size: 14px;
    color: ${props.theme.placeholder};
  }

  &.parse-error {
    font-family: ${props.theme.fontFamilyMono};
    font-size: 14px;
    color: ${props.theme.brand.red};
  }
}

pre {
  display: block;
  overflow-x: auto;
  padding: 1em 1.2em;
  line-height: 1.5em;
  position: relative;
  background: ${props.theme.codeBackground};
  border-radius: 8px;
  border: 0;
  margin: 1.4em 0;

  -webkit-font-smoothing: initial;
  font-family: ${props.theme.fontFamilyMono};
  direction: ltr;
  text-align: left;
  white-space: pre;
  word-spacing: normal;
  word-break: normal;
  -moz-tab-size: 4;
  -o-tab-size: 4;
  tab-size: 4;
  -webkit-hyphens: none;
  -moz-hyphens: none;
  -ms-hyphens: none;
  hyphens: none;
  color: ${props.theme.code};

  code {
    font-size: inherit;
    background: none;
    padding: 0;
    border: 0;
  }
}

table {
  width: 100%;
  border-collapse: separate;
  border-radius: ${EditorStyleHelper.blockRadius};
  margin-top: 1.4em;
  margin-bottom: 1.4em;
  box-sizing: border-box;
  border: 1px solid ${props.theme.divider};
  border-left: 0;
  border-spacing: 0;

  * {
    box-sizing: border-box;
  }

  tr {
    position: relative;
    border-bottom: 1px solid ${props.theme.divider};
    border-color: inherit;
  }

  td,
  th {
    position: relative;
    vertical-align: top;
    position: relative;
    padding: 6px 12px;
    text-align: start;
    font-weight: normal;
    border-left: 1px solid ${props.theme.divider};
    border-top: 1px solid ${props.theme.divider};
  }

  th {
    background: ${props.theme.backgroundSecondary};
    color: ${props.theme.textSecondary};
    font-weight: 500;
  }

  tr:first-child th,
  tr:first-child td {
    border-top: 0;
  }
  tr:first-child th[data-first-column],
  tr:first-child td[data-first-column] {
    border-top-left-radius: ${EditorStyleHelper.blockRadius};
  }
  th[data-first-column][data-last-row],
  td[data-first-column][data-last-row] {
    border-bottom-left-radius: ${EditorStyleHelper.blockRadius};
  }
  tr:first-child th[data-last-column],
  tr:first-child td[data-last-column] {
    border-top-right-radius: ${EditorStyleHelper.blockRadius};
  }
  th[data-last-column][data-last-row],
  td[data-last-column][data-last-row] {
    border-bottom-right-radius: ${EditorStyleHelper.blockRadius};
  }

  td .component-embed {
    padding: 4px 0;
  }

  td[data-bgcolor],
  th[data-bgcolor] {
    color: var(--cell-text-color);
    background: linear-gradient(var(--cell-bg-color), var(--cell-bg-color)), linear-gradient(${props.theme.background}, ${props.theme.background});

    p, a, p a {
      color: var(--cell-text-color, inherit);
    }

    a, p a {
      text-decoration: underline;
      text-decoration-color: var(--cell-text-color, inherit);
    }
  }

  .selectedCell {
    /* Using box-shadow inset instead of background to allow overlay on cell background colors */
    box-shadow: inset 0 0 0 9999px ${props.theme.tableSelectedBackground};

    /* fixes Firefox background color painting over border:
      * https://bugzilla.mozilla.org/show_bug.cgi?id=688556 */
    background-clip: padding-box;

    @media print {
      box-shadow: none;
    }
  }

  .${EditorStyleHelper.tableAddRow},
  .${EditorStyleHelper.tableAddColumn} {
    display: block;
    position: absolute;
    background: ${props.theme.accent};
    cursor: var(--pointer);

    &:hover::after {
      width: 16px;
      height: 16px;
      z-index: 20;
      background-color: ${props.theme.accent};
      background-size: 16px 16px;
      background-position: 50% 50%;
      background-image: url("data:image/svg+xml;base64,${btoa(
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 5C11.4477 5 11 5.44772 11 6V11H6C5.44772 11 5 11.4477 5 12C5 12.5523 5.44772 13 6 13H11V18C11 18.5523 11.4477 19 12 19C12.5523 19 13 18.5523 13 18V13H18C18.5523 13 19 12.5523 19 12C19 11.4477 18.5523 11 18 11H13V6C13 5.44772 12.5523 5 12 5Z" fill="white"/></svg>',
      )}")
    }

    // extra clickable area
    &::before {
      content: "";
      display: block;
      cursor: var(--pointer);
      position: absolute;
      width: 24px;
      height: 24px;
    }
  }

  .${EditorStyleHelper.tableAddRow} {
    bottom: -1px;
    left: -12px;
    width: 0;
    height: 2px;
    z-index: 1;

    &::after {
      content: "";
      position: absolute;
      bottom: -1px;
      left: -8px;
      width: 4px;
      height: 4px;
      display: ${props.readOnly ? "none" : "block"};
      border-radius: 100%;
      background-color: ${props.theme.divider};
    }

    &:hover {
      width: var(--table-width);
    }

    &:hover::after {
      bottom: -7.5px;
      left: -12px;
    }

    // extra clickable area
    &::before {
      bottom: -12px;
      left: -14px;
    }

    &.first {
      bottom: auto;
      top: -1px;

      &::before {
        bottom: auto;
        top: -12px;
      }
    }
  }

  .${EditorStyleHelper.tableAddColumn} {
    top: -12px;
    right: -1px;
    width: 2px;
    height: 0;
    z-index: 1;

    &::after {
      content: "";
      position: absolute;
      top: -8px;
      right: -1px;
      width: 4px;
      height: 4px;
      display: ${props.readOnly ? "none" : "block"};
      border-radius: 100%;
      background-color: ${props.theme.divider};
    }

    &:hover {
      height: calc(var(--table-height) - 10px);
    }

    &:hover::after {
      top: -12px;
      right: -7px;
    }

    // extra clickable area
    &::before {
      top: -14px;
      right: -12px;
    }

    &.first {
      right: auto;
      left: -1px;

      &::before {
        right: auto;
        left: -12px;
      }
    }
  }

  .${EditorStyleHelper.tableGripColumn} {
    /* usage of ::after for all of the table grips works around a bug in
     * prosemirror-tables that causes Safari to hang when selecting a cell
     * in an empty table:
     * https://github.com/ProseMirror/prosemirror/issues/947 */
    &::after {
      content: "";
      cursor: grab;
      position: absolute;
      top: -12px;
      left: 0;
      width: 100%;
      height: 8px;
      background: ${props.theme.divider};
      display: ${props.readOnly ? "none" : "block"};
    }

    &:hover::after {
      background: ${props.theme.accent};
    }

    body.${EditorStyleHelper.tableDragging} &:hover::after {
      background: ${props.theme.accent};
    }
    &.first::after {
      border-top-left-radius: 3px;
      border-bottom-left-radius: 3px;
    }
    &.selected::after {
      background: ${props.theme.accent};
    }
  }

  [data-last-column] .${EditorStyleHelper.tableGripColumn}::after {
    border-top-right-radius: 3px;
    border-bottom-right-radius: 3px;
  }

  .${EditorStyleHelper.tableGripRow} {
    &::after {
      content: "";
      cursor: grab;
      position: absolute;
      left: -12px;
      top: 0;
      height: 100%;
      width: 8px;
      background: ${props.theme.divider};
      border-color: ${props.theme.background};
      display: ${props.readOnly ? "none" : "block"};
    }

    &:hover::after {
      background: ${props.theme.accent};
    }

    body.${EditorStyleHelper.tableDragging} &:hover::after {
      background: ${props.theme.accent};
    }
    &.first::after {
      border-top-left-radius: 3px;
      border-top-right-radius: 3px;
    }
    &.selected::after {
      background: ${props.theme.accent};
    }
  }

  [data-last-row] .${EditorStyleHelper.tableGripRow}::after {
    border-bottom-left-radius: 3px;
    border-bottom-right-radius: 3px;
  }

  .${EditorStyleHelper.tableGrip} {
    &::after {
      content: "";
      cursor: var(--pointer);
      background: ${props.theme.divider};
      width: 10px;
      height: 10px;
      border-radius: 10px;
      border: 2px solid ${props.theme.background};
      position: absolute;
      top: -14px;
      left: -14px;
      display: ${props.readOnly ? "none" : "block"};
      z-index: 10;
    }

    &:hover::after {
      background: ${props.theme.accent};
    }
    &.selected::after {
      background: ${props.theme.accent};
    }
    &.dragging::after {
      background: ${props.theme.accent};
      opacity: 0.5;
    }
  }

  .${EditorStyleHelper.tableAddRow},
  .${EditorStyleHelper.tableAddColumn},
  .${EditorStyleHelper.tableGrip},
  .${EditorStyleHelper.tableGripColumn},
  .${EditorStyleHelper.tableGripRow} {
    @media print {
      display: none;
    }
  }
}

.${EditorStyleHelper.tableDragDropIndicator} {
  position: absolute;
  background: ${props.theme.accent};
  pointer-events: none;
  z-index: 100;
  opacity: 0;
  transition: opacity 100ms ease-in-out;

  &.active {
    opacity: 1;
  }

  &[data-type="row"] {
    height: 2px;
    border-radius: 1px;
  }

  &[data-type="column"] {
    width: 2px;
    border-radius: 1px;
  }
}

.${EditorStyleHelper.tableGripRow},
.${EditorStyleHelper.tableGripColumn} {
  &.dragging::after {
    cursor: grabbing;
    background: ${props.theme.accent};
    opacity: 0.5;
  }
}

.${EditorStyleHelper.tableDragIndicatorLeft},
.${EditorStyleHelper.tableDragIndicatorRight} {
  position: absolute;
  top: 0;
  width: 2px;
  height: calc(var(--table-height) - 10px);
  background: ${props.theme.accent};
  z-index: 100;
  pointer-events: none;
}

.${EditorStyleHelper.tableDragIndicatorLeft} {
  left: -1px;
}

.${EditorStyleHelper.tableDragIndicatorRight} {
  right: -1px;
}

.${EditorStyleHelper.tableDragIndicatorTop},
.${EditorStyleHelper.tableDragIndicatorBottom} {
  position: absolute;
  left: 0;
  height: 2px;
  width: calc(var(--table-width) - 2px);
  background: ${props.theme.accent};
  z-index: 100;
  pointer-events: none;
}

.${EditorStyleHelper.tableDragIndicatorTop} {
  top: -1px;
}

.${EditorStyleHelper.tableDragIndicatorBottom} {
  bottom: -1px;
}

.${EditorStyleHelper.table} {
  position: relative;
}

.${EditorStyleHelper.tableStickyHeader} {
  > .${EditorStyleHelper.tableScrollable} > table > tbody > tr:first-child {
    position: relative;
    z-index: 2;

    > th {
      // Safari requires the header cell to have raised z-index too
      z-index: 2;
    }
  }

  > .${EditorStyleHelper.tableScrollable} > table > tbody > tr:first-child > th {
    transform: translateY(calc(var(--header-offset, 64px) + var(--sticky-scroll-offset, 0px)));

    // Mask content scrolling past the top of the header (first shadow) and draw
    // the divider below it (second shadow). Using box-shadow rather than a real
    // border avoids changing the row height when the sticky class toggles, which
    // otherwise causes a flicker loop at the bottom of the table via scroll anchoring.
    box-shadow: 0 -1px 0 ${props.theme.divider}, 0 1px 0 ${props.theme.divider};
    border-radius: 0 !important;

    .${EditorStyleHelper.tableGripColumn},
    .${EditorStyleHelper.tableAddColumn},
    .${EditorStyleHelper.tableAddRow},
    .${EditorStyleHelper.tableGrip} {
      display: none;
    }
  }

  > .${EditorStyleHelper.tableGrip} {
    display: none;
  }
}

.${EditorStyleHelper.tableScrollable} {
  position: relative;
  margin: -1em 0 -0.5em;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
  overflow-y: hidden;
  overflow-x: auto;
  overflow-anchor: none;
  padding-top: 1em;
  padding-bottom: .5em;
  padding-left: 0;
  padding-right: 0;
  transition: border 250ms ease-in-out 0s;

  &:hover {
    scrollbar-color: ${props.theme.scrollbarThumb} ${
      props.theme.scrollbarBackground
    };
  }

  & ::-webkit-scrollbar {
    height: 14px;
    background-color: transparent;
  }

  &:hover ::-webkit-scrollbar {
    background-color: ${props.theme.scrollbarBackground};
  }

  & ::-webkit-scrollbar-thumb {
    background-color: transparent;
    border: 3px solid transparent;
    border-radius: 7px;
  }

  &:hover ::-webkit-scrollbar-thumb {
    background-color: ${props.theme.scrollbarThumb};
    border-color: ${props.theme.scrollbarBackground};
  }
}

.${EditorStyleHelper.tableShadowLeft}::before,
.${EditorStyleHelper.tableShadowRight}::after {
  content: "";
  position: absolute;
  top: 1px;
  bottom: 0;
  left: -1em;
  width: 32px;
  z-index: 20;
  transition: box-shadow 250ms ease-in-out;
  border: 0px solid transparent;
  pointer-events: none;
}

.${EditorStyleHelper.tableShadowLeft}::before {
  left: 0;
  right: auto;
  box-shadow: 16px 0 16px -16px inset rgba(0, 0, 0, ${
    props.theme.isDark ? 1 : 0.25
  });
}

.${EditorStyleHelper.tableShadowRight}::after {
  right: 0;
  left: auto;
  box-shadow: -16px 0 16px -16px inset rgba(0, 0, 0, ${
    props.theme.isDark ? 1 : 0.25
  });
}

.ProseMirror-gapcursor {
  display: none;
  pointer-events: none;
  position: absolute;
}

/* Block drop indicator — matches the sidebar drop cursor (accent line + dot). */
.block-drop-cursor {
  border-radius: 2px;

  &::after {
    content: "";
    box-sizing: border-box;
    position: absolute;
    inset-inline-start: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: ${props.theme.background};
    border: 2px solid ${props.theme.accent};
  }
}

.${EditorStyleHelper.blockColor} {
  --block-color-background: transparent;
  --block-visual-background: var(--block-color-background);
  --block-visual-horizontal-padding: 0px;
  --block-visual-top: -3px;
  --block-visual-bottom: -3px;

  position: relative;
  z-index: 0;
  background: transparent;
  box-shadow: none;

  a {
    color: inherit;
    text-decoration-color: currentColor;
  }
}

.${EditorStyleHelper.blockColor}:not(li)::after,
.block-gutter-active:not(li)::after,
li.${EditorStyleHelper.blockColor}::after,
li.block-gutter-active::after {
  content: "";
  display: block;
  position: absolute;
  top: var(--block-visual-top);
  bottom: var(--block-visual-bottom);
  z-index: -1;
  border-radius: ${EditorStyleHelper.blockRadius};
  background: var(--block-visual-background);
  pointer-events: none;
}

.${EditorStyleHelper.blockColor}:not(li)::after,
.block-gutter-active:not(li)::after {
  left: calc(
    var(--block-visual-left, 0px) - var(--block-visual-horizontal-padding)
  );
  right: calc(
    var(--block-visual-right, 0px) - var(--block-visual-horizontal-padding)
  );
}

li.${EditorStyleHelper.blockColor}::after,
li.block-gutter-active::after {
  left: calc(
    var(--block-visual-left, -28px) - var(--block-visual-horizontal-padding)
  );
  right: calc(
    var(--block-visual-right, 0px) - var(--block-visual-horizontal-padding)
  );
}

blockquote.${EditorStyleHelper.blockColor},
blockquote.block-gutter-active {
  overflow: visible;
}

blockquote.${EditorStyleHelper.blockColor}::before,
blockquote.block-gutter-active::before {
  z-index: 1;
}

.${EditorStyleHelper.toggleBlock}.${EditorStyleHelper.blockColor} {
  padding: 0;
  margin: 0;
}

li.${EditorStyleHelper.blockColor},
li.block-gutter-active {
  --block-visual-background: var(--block-color-background);
  --block-visual-horizontal-padding: 0px;
  --block-visual-top: 2px;
  --block-visual-bottom: 2px;
}

li.block-gutter-active {
  --block-visual-background: var(--block-gutter-active-background);
}

li.${EditorStyleHelper.blockColor} > *,
li.block-gutter-active > * {
  position: relative;
}

/* Block highlighted while its gutter actions menu is open. */
.block-gutter-active {
  --block-gutter-active-background: ${transparentize(0.88, props.theme.accent)};
  --block-visual-background: var(--block-gutter-active-background);
  --block-visual-horizontal-padding: 0px;
  --block-visual-top: -3px;
  --block-visual-bottom: -3px;

  position: relative;
  z-index: 0;
  background: transparent;
  box-shadow: none;
  transition:
    background 120ms ease,
    box-shadow 120ms ease;
}

.block-gutter-active.ProseMirror-selectednode {
  outline: none;
}

/* Clean drag ghost (no shadow) for block dragging via the gutter handle. */
.block-gutter-drag-image,
.block-gutter-drag-image * {
  outline: none !important;
  box-shadow: none !important;
  border-color: transparent !important;
  background-color: ${props.theme.background};
}

.block-gutter-drag-image::before,
.block-gutter-drag-image::after,
.block-gutter-drag-image *::before,
.block-gutter-drag-image *::after {
  box-shadow: none !important;
  border-color: transparent !important;
}

.ProseMirror.block-gutter-dragging .ProseMirror-selectednode,
.ProseMirror.block-gutter-dragging .ProseMirror-selectednode * {
  outline: none !important;
  box-shadow: none !important;
  border-color: transparent !important;
}

.ProseMirror.block-gutter-dragging .ProseMirror-selectednode::before,
.ProseMirror.block-gutter-dragging .ProseMirror-selectednode::after,
.ProseMirror.block-gutter-dragging .ProseMirror-selectednode *::before,
.ProseMirror.block-gutter-dragging .ProseMirror-selectednode *::after {
  box-shadow: none !important;
  border-color: transparent !important;
}

.ProseMirror-gapcursor::after {
  content: "";
  display: block;
  position: absolute;
  top: -2px;
  width: 20px;
  border-top: 1px solid ${props.theme.cursor};
  animation: ProseMirror-cursor-blink 1.1s steps(2, start) infinite;
}

@keyframes ProseMirror-cursor-blink {
  to {
    visibility: hidden;
  }
}

.ProseMirror-focused .ProseMirror-gapcursor {
  display: block;
}

del {
  color: ${props.theme.slate};
  text-decoration: strikethrough;
}

@media print {
  .placeholder::before,
  .heading-anchor,
  button.show-source-button,
  h1:not(.placeholder)::before,
  h2:not(.placeholder)::before,
  h3:not(.placeholder)::before,
  h4:not(.placeholder)::before,
  h5:not(.placeholder)::before,
  h6:not(.placeholder)::before {
    display: none;
  }

  .image {
    page-break-inside: avoid;
  }

  .${EditorStyleHelper.comment} {
    border: 0;
    background: none;
  }

  .page-break {
    opacity: 0;
  }

  pre {
    overflow-x: hidden;
    white-space: pre-wrap;
  }

  em,
  blockquote {
    font-family: "SF Pro Text", ${props.theme.fontFamily};
  }
}

li > .${EditorStyleHelper.toggleBlock} {
  position: relative;
  /* Nudge the toggle to visually align with the first line of list-item text.
     Keep this in em so it scales with the current font size. */
  top: 0.4em;
}

.${EditorStyleHelper.toggleBlock} {
  display: flex;

  &:focus-within {
    transition-delay: 0.1s;
  }

  &.${EditorStyleHelper.toggleBlockFolded} {
    &:dir(rtl) {
      --rotate-by: 90deg;
    }
    &:dir(ltr) {
      --rotate-by: -90deg;
    }
    > .${EditorStyleHelper.toggleBlockContent} > :is(:not(.${EditorStyleHelper.toggleBlockHead})) {
      display: none;
    }
    > .${EditorStyleHelper.toggleBlockContent} > :is(a.heading-name) {
      display: unset;
    }
    > .${EditorStyleHelper.toggleBlockButton} {
      svg {
        transform: rotate(var(--rotate-by));
        pointer-events: none;
      }
      opacity: 1;
    }
  }

  > .${EditorStyleHelper.toggleBlockButton} {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    --line-height: var(--line-height-p);
    --font-size: var(--font-size-p);

    &:has(+ .${EditorStyleHelper.toggleBlockContent} > .${EditorStyleHelper.toggleBlockHead} > h1) {
      --line-height: calc(var(--line-height-h) + 0.2);
      --font-size: var(--font-size-h1);
    }

    &:has(+ .${EditorStyleHelper.toggleBlockContent} > .${EditorStyleHelper.toggleBlockHead} > h2) {
      --line-height: calc(var(--line-height-h) + 0.2);
      --font-size: var(--font-size-h2);
    }

    &:has(+ .${EditorStyleHelper.toggleBlockContent} > .${EditorStyleHelper.toggleBlockHead} > h3) {
      --line-height: calc(var(--line-height-h) + 0.2);
      --font-size: var(--font-size-h3);
    }

    &:has(+ .${EditorStyleHelper.toggleBlockContent} > .${EditorStyleHelper.toggleBlockHead} > h4) {
      --line-height: calc(var(--line-height-h) + 0.2);
      --font-size: var(--font-size-h4);
    }

    color: ${props.theme.text};
    opacity: 0.75;
    cursor: var(--pointer);
    background: none;
    outline: none;
    border: 0;
    margin: 0;
    padding: 0;
    height: calc(var(--line-height) * var(--font-size));
    width: 20px;
    overflow: unset;

    &:focus,
    &:hover {
      opacity: 1;
    }

    > svg {
      transition: transform 200ms ease-out;
      flex-shrink: 0;
    }
  }

  > .${EditorStyleHelper.toggleBlockContent} {
    > :is(:not(.${EditorStyleHelper.toggleBlockHead})) {
      margin-top: 0.5em;
    }
    > :is(:first-child) {
      margin-top: 0;
    }
    > .${EditorStyleHelper.toggleBlockHead} {
      > * {
        margin-top: 0;
      }

      /* When the title is a heading, match the placeholder text to its size */
      &.placeholder:has(> :is(h1, h2, h3, h4))::before {
        font-weight: 600;
      }
      &.placeholder:has(> h1)::before {
        font-size: var(--font-size-h1);
      }
      &.placeholder:has(> h2)::before {
        font-size: var(--font-size-h2);
      }
      &.placeholder:has(> h3)::before {
        font-size: var(--font-size-h3);
      }
      &.placeholder:has(> h4)::before {
        font-size: var(--font-size-h4);
      }
    }
    flex-grow: 1;
    overflow: unset;
    min-width: 0;
  }
}
`;

const EditorContainer = styled.div<Props>`
  ${style}
  ${mathStyle}
  ${codeMarkCursor}
  ${codeBlockStyle}
  ${diffStyle}
  ${findAndReplaceStyle}
  ${emailStyle}
  ${textStyle}
`;

export default EditorContainer;
