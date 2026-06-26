import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "../../styles";
import type { Heading } from "../../utils/ProsemirrorHelper";
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
 * and renders a numbered, indented outline that scrolls to each heading on
 * click. Re-renders automatically when the document's headings change (driven
 * by a decoration plugin on the parent node).
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
        <Title>{t("Table of contents")}</Title>
        <Empty>
          {isEditable
            ? t("Add headings to populate the table of contents")
            : t("No headings yet")}
        </Empty>
      </Wrapper>
    );
  }

  // Normalize so the shallowest heading becomes level 1 — prevents deep
  // indentation when a document starts at, say, an H3.
  const minLevel = headings.reduce(
    (memo, heading) => Math.min(memo, heading.level),
    Infinity
  );
  const adjustment = minLevel - 1;

  // Build hierarchical numbering (1, 2, 2.1, 2.2, 3 …) based on adjusted level.
  const counters: number[] = [];
  const numbered = headings.map((heading) => {
    const level = heading.level - adjustment; // 1-based
    counters[level - 1] = (counters[level - 1] ?? 0) + 1;
    counters.length = level; // reset deeper counters
    return { heading, level, label: counters.join(".") };
  });

  return (
    <Wrapper contentEditable={false}>
      <Title>{t("Table of contents")}</Title>
      <List>
        {numbered.map(({ heading, level, label }) => (
          <Item key={heading.id} $level={level}>
            <Anchor
              href={`#${heading.id}`}
              onClick={(event) => handleClick(event, heading.id)}
            >
              <Marker>{label}</Marker>
              <span>{heading.title}</span>
            </Anchor>
          </Item>
        ))}
      </List>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  margin: 0.75em 0;
  padding: 12px 16px;
  border: 1px solid ${s("divider")};
  border-radius: 8px;
  background: ${s("backgroundSecondary")};
  user-select: none;
`;

const Title = styled.div`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${s("textTertiary")};
  margin-bottom: 8px;
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
  padding-inline-start: ${(props) => (props.$level - 1) * 22}px;
`;

const Marker = styled.span`
  color: ${s("textTertiary")};
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
`;

const Anchor = styled.a`
  display: flex;
  gap: 8px;
  align-items: baseline;
  padding: 3px 0;
  font-size: 15px;
  line-height: 1.5;
  color: ${s("text")};
  text-decoration: none;
  cursor: var(--pointer);

  > span:last-child {
    border-bottom: 1px solid transparent;
  }

  &:hover > span:last-child {
    border-bottom-color: ${s("textTertiary")};
  }
`;

export default TableOfContents;
