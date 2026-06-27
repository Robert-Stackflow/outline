import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "../../styles";
import { ProsemirrorHelper } from "../../utils/ProsemirrorHelper";
import type { ComponentProps } from "../types";

/**
 * Decodes a URI component without throwing on malformed input.
 */
function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch (_err) {
    return value;
  }
}

/**
 * A live table of contents block. Reads the headings from the current document
 * and renders an indented outline (Notion-style: no border, no numbering) that
 * scrolls to each heading on click. Re-renders automatically when the document's
 * headings change (driven by a decoration plugin on the parent node).
 */
function TableOfContents({ view, isEditable }: Omit<ComponentProps, "theme">) {
  const { t } = useTranslation();

  const headings = ProsemirrorHelper.getHeadings(view.state.doc).filter(
    (heading) => heading.level <= 3
  );

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      event.preventDefault();

      const element = window.document.getElementById(safeDecode(id));
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        if (window.history?.replaceState) {
          window.history.replaceState(null, "", `#${id}`);
        }
      }
    },
    []
  );

  if (headings.length === 0) {
    return (
      <Wrapper contentEditable={false}>
        <Empty>
          {isEditable
            ? t("Add headings to populate the table of contents")
            : t("No headings yet")}
        </Empty>
      </Wrapper>
    );
  }

  // Normalize so the shallowest heading becomes level 1 — prevents deep
  // indentation when a document starts at, say, an H2.
  const minLevel = headings.reduce(
    (memo, heading) => Math.min(memo, heading.level),
    Infinity
  );
  const adjustment = minLevel - 1;

  return (
    <Wrapper contentEditable={false}>
      <List>
        {headings.map((heading) => (
          <Item key={heading.id} $level={heading.level - adjustment}>
            <Anchor
              href={`#${heading.id}`}
              onClick={(event) => handleClick(event, heading.id)}
            >
              {heading.title}
            </Anchor>
          </Item>
        ))}
      </List>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  margin: 0.75em 0;
  user-select: none;
`;

const Empty = styled.div`
  font-size: 14px;
  color: ${s("textTertiary")};
`;

const List = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`;

const Item = styled.li<{ $level: number }>`
  margin: 0;
  padding-inline-start: ${(props) => (props.$level - 1) * 24}px;
`;

const Anchor = styled.a`
  display: inline-block;
  padding: 3px 0;
  font-size: 15px;
  line-height: 1.6;
  cursor: var(--pointer);
  border-bottom: 1px solid transparent;

  /* Override the editor's global link color so TOC entries read as text.
     Doubled selector beats the ".ProseMirror a" rule on specificity. */
  &&,
  &&:hover,
  &&:focus {
    color: ${s("text")};
    text-decoration: none;
  }

  &&:hover {
    border-bottom-color: ${s("textTertiary")};
  }
`;

export default TableOfContents;
