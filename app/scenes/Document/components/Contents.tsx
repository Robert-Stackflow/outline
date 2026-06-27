import { observer } from "mobx-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { EmojiText } from "@shared/components/EmojiText";
import { depths, hideScrollbars, s } from "@shared/styles";
import { useDocumentContext } from "~/components/DocumentContext";
import { Portal } from "~/components/Portal";
import useWindowScrollPosition from "~/hooks/useWindowScrollPosition";
import { patchLocation } from "~/utils/history";
import { decodeURIComponentSafe } from "~/utils/urls";

const HEADING_OFFSET = 20;
const PANEL_WIDTH = 280;

function Contents() {
  const history = useHistory();
  const [activeSlug, setActiveSlug] = useState<string>();
  const scrollPosition = useWindowScrollPosition({
    throttle: 100,
  });
  const { headings } = useDocumentContext();
  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({});

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      // Let modified clicks (open in new tab, copy link, etc.) fall through to
      // the native anchor behavior.
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

      // Smoothly scroll the heading into view rather than jumping abruptly.
      const element = window.document.getElementById(
        decodeURIComponentSafe(id)
      );
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      // Update the location hash (without a hard navigation) so the URL stays
      // shareable and the active sidebar context is retained.
      history.replace(patchLocation(history.location, { hash: `#${id}` }));
    },
    [history]
  );

  useEffect(() => {
    let activeId = headings.length > 0 ? headings[0].id : undefined;

    for (let key = 0; key < headings.length; key++) {
      const heading = headings[key];
      const element = window.document.getElementById(
        decodeURIComponentSafe(heading.id)
      );

      if (element) {
        const bounding = element.getBoundingClientRect();
        if (bounding.top > HEADING_OFFSET) {
          break;
        }
        activeId = heading.id;
      }
    }

    if (activeSlug !== activeId) {
      setActiveSlug(activeId);
    }
  }, [scrollPosition, headings, activeSlug]);

  useEffect(() => {
    const activeItem = activeSlug ? itemRefs.current[activeSlug] : undefined;

    if (activeItem) {
      activeItem.scrollIntoView({
        block: "nearest",
      });
    }
  }, [activeSlug]);

  // calculate the minimum heading level and adjust all the headings to make
  // that the top-most. This prevents the contents from being weirdly indented
  // if all of the headings in the document start at level 3, for example.
  const minHeading = headings.reduce(
    (memo, heading) => (heading.level < memo ? heading.level : memo),
    Infinity
  );
  const headingAdjustment = minHeading - 1;
  const { t } = useTranslation();

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Position the expanded panel as a viewport-clamped popover anchored to the
  // minimap, so it is never clipped on narrow layouts or by ancestor overflow.
  const openPanel = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    const el = wrapperRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const margin = 12;
      // Open to the left of the right-aligned minimap, clamped to the viewport.
      const left = Math.min(
        Math.max(margin, rect.right - PANEL_WIDTH),
        window.innerWidth - PANEL_WIDTH - margin
      );
      const top = Math.max(margin, rect.top - 10);
      const maxHeight = window.innerHeight - top - margin;
      setPanelStyle({ left, top, maxHeight });
    }
    setOpen(true);
  }, []);

  // Small delay so the cursor can travel from the minimap to the (portaled)
  // panel without it closing in between.
  const scheduleClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
    }
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }, []);

  useEffect(
    () => () => {
      if (closeTimer.current) {
        clearTimeout(closeTimer.current);
      }
    },
    []
  );

  if (headings.length === 0) {
    return <Outer />;
  }

  const items = headings.filter((heading) => heading.level < 4);

  return (
    <Outer>
      <Inner
        ref={wrapperRef}
        onMouseEnter={openPanel}
        onMouseLeave={scheduleClose}
      >
        {/* Collapsed Notion-style minimap of lines, always visible. */}
        <Minimap aria-hidden $hidden={open}>
          {items.map((heading) => (
            <Line
              key={heading.id}
              level={heading.level - headingAdjustment}
              active={activeSlug === heading.id}
            />
          ))}
        </Minimap>
      </Inner>

      {/* Portaled so it escapes editor stacking contexts (images, etc.) and is
          never covered by document content. */}
      <Portal>
        <Panel
          aria-label={t("Contents")}
          style={panelStyle}
          $open={open}
          onMouseEnter={openPanel}
          onMouseLeave={scheduleClose}
        >
          <Heading>{t("Contents")}</Heading>
          <List>
            {items.map((heading) => (
              <ListItem
                key={heading.id}
                ref={(el) => (itemRefs.current[heading.id] = el)}
                level={heading.level - headingAdjustment}
              >
                <Link
                  href={`#${heading.id}`}
                  $active={activeSlug === heading.id}
                  onClick={(event) => handleClick(event, heading.id)}
                >
                  <EmojiText>{heading.title}</EmojiText>
                </Link>
              </ListItem>
            ))}
          </List>
        </Panel>
      </Portal>
    </Outer>
  );
}

const Outer = styled.div`
  display: none;
  position: absolute;
  inset-inline-end: 24px;
  top: 0;
  bottom: 0;
  z-index: 1;
  pointer-events: none;

  ${breakpoint("tablet")`
    display: block;
  `};
`;

// Only this narrow group captures hover, so the popup opens just on the TOC.
// The containing block is the document body, so covers and other page chrome do
// not participate in the minimap's positioning.
const Inner = styled.div`
  position: sticky;
  top: max(calc(var(--header-offset, 64px) + 88px), 28vh);
  pointer-events: auto;
  max-height: calc(100vh - 140px);
  overflow-y: auto;
  ${hideScrollbars()}
`;

const Minimap = styled.div<{ $hidden?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 9px;
  padding: 10px 0;
  transition: opacity 180ms ease;
  opacity: ${(props) => (props.$hidden ? 0 : 1)};
  pointer-events: ${(props) => (props.$hidden ? "none" : "auto")};
`;

const Line = styled.div<{ level: number; active?: boolean }>`
  height: ${(props) => (props.active ? 3 : 2)}px;
  width: ${(props) => Math.max(8, 18 - (props.level - 1) * 4)}px;
  border-radius: 2px;
  background: ${(props) =>
    props.active ? props.theme.text : props.theme.divider};
  transition:
    background 150ms ease,
    height 150ms ease;
`;

const Panel = styled.nav<{ $open?: boolean }>`
  position: fixed;
  z-index: ${depths.menu};
  width: ${PANEL_WIDTH}px;
  max-height: calc(100vh - 110px);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 12px 16px 14px;
  border-radius: 12px;
  background: ${s("menuBackground")};
  box-shadow: ${s("menuShadow")};

  transition:
    opacity 180ms ease,
    transform 180ms ease;

  ${hideScrollbars()}

  opacity: ${(props) => (props.$open ? 1 : 0)};
  transform: translateX(${(props) => (props.$open ? 0 : "-6px")});
  pointer-events: ${(props) => (props.$open ? "auto" : "none")};
`;

const Heading = styled.h3`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: ${s("textTertiary")};
  letter-spacing: 0.04em;
  margin: 0 0 8px;
`;

const ListItem = styled.li<{ level: number }>`
  position: relative;
  margin: 0;
  padding-inline-start: ${(props) => (props.level - 1) * 14}px;
  word-break: break-word;
`;

const Link = styled.a<{ $active?: boolean }>`
  display: block;
  padding: 5px 8px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.4;
  font-weight: ${(props) => (props.$active ? 500 : 400)};
  color: ${(props) =>
    props.$active ? props.theme.accent : props.theme.textTertiary};
  transition:
    background 120ms ease,
    color 120ms ease;
  cursor: var(--pointer);

  &:hover {
    background: ${(props) => props.theme.listItemHoverBackground};
    color: ${(props) =>
      props.$active ? props.theme.accent : props.theme.text};
  }
`;

const List = styled.ol`
  margin: 0;
  padding: 0;
  list-style: none;
`;

export default observer(Contents);
