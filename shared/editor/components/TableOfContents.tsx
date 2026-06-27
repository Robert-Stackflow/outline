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
 * scrolls to each heading on click. Entries are rendered as spans rather than
 * anchors so they don't inherit the editor's link color.
 */
function TableOfContents({ view, isEditable }: Omit<ComponentProps, "theme">) {
  const { t } = useTranslation();

  const headings = ProsemirrorHelper.getHeadings(view.state.doc).filter(
    (heading) => heading.level <= 3
  );

  const scrollTo = React.useCallback((id: string) => {
    const element = window.document.getElementById(safeDecode(id));
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      if (window.history?.replaceState) {
        window.history.replaceState(null, "", `#${id}`);
      }
    }
  }, []);

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
            <Entry
              role="link"
              tabIndex={0}
              onClick={() => scrollTo(heading.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  scrollTo(heading.id);
                }
              }}
            >
              {heading.title}
            </Entry>
          </Item>
        ))}
      </List>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  margin: 0.45em 0;
  user-select: none;
`;

const Empty = styled.div`
  font-size: 13px;
  color: ${s("textTertiary")};
`;

const List = styled.ul`
  margin: 0 !important;
  padding: 0 !important;
  list-style: none;
`;

const Item = styled.li<{ $level: number }>`
  margin: 0;
  padding-inline-start: ${(props) => (props.$level - 1) * 18}px !important;
`;

const Entry = styled.span`
  display: block;
  width: 100%;
  padding: 3px 7px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.45;
  cursor: var(--pointer);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition:
    background 100ms ease,
    color 100ms ease,
    opacity 100ms ease;

  /* Notion-style: theme-colored, underlined links by default. Rendered as a
     span so the editor's global link rules don't fight our styling. */
  color: ${s("link")};
  text-decoration: underline;
  text-decoration-color: ${s("link")};
  text-underline-offset: 2px;

  &:hover {
    background: ${s("listItemHoverBackground")};
    color: ${s("text")};
    opacity: 0.78;
  }

  &:focus-visible {
    background: ${s("listItemHoverBackground")};
    color: ${s("text")};
    outline: none;
    opacity: 0.78;
  }
`;

export default TableOfContents;
