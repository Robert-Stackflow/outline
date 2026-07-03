import * as React from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { ShrinkIcon, GrowIcon, CloseIcon } from "outline-icons";
import styled, { useTheme } from "styled-components";
import Icon from "@shared/components/Icon";
import { richExtensions } from "@shared/editor/nodes";
import { canUseElementFullscreen } from "@shared/utils/browser";
import { s, depths, hover } from "@shared/styles";
import { cloneDeep } from "es-toolkit/compat";
import type { ProsemirrorData } from "@shared/types";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { colorPalette } from "@shared/utils/collections";
import Editor from "~/components/Editor";
import NudeButton from "~/components/NudeButton";
import Text from "~/components/Text";
import Flex from "~/components/Flex";
import Tooltip from "~/components/Tooltip";
import useIdle from "~/hooks/useIdle";
import useKeyDown from "~/hooks/useKeyDown";
import { ArrowLeftIcon, ArrowRightIcon } from "~/components/Icons/ArrowIcon";

/** Activity events that reset the idle timer — excludes keyboard to stay idle during navigation. */
const idleEvents = [
  "click",
  "mousemove",
  "mousedown",
  "touchstart",
  "touchmove",
];

type Slide =
  | {
      type: "title";
      title: string;
      icon?: string | null;
      iconColor?: string | null;
    }
  | { type: "content"; content: ProsemirrorData[] }
  | { type: "instructions" };

const maxSlideWeight = 16;
const minPresentationScale = 0.25;

interface Props {
  /** The document title. */
  title: string;
  /** The document icon. */
  icon?: string | null;
  /** The document icon color. */
  iconColor?: string | null;
  /** The prosemirror data for the document. */
  data: ProsemirrorData;
  /** Callback when presentation mode is closed. */
  onClose: () => void;
}

/**
 * Returns true if the given content nodes contain no meaningful text or elements.
 *
 * @param nodes the prosemirror content nodes.
 * @returns true when every node is an empty paragraph.
 */
function isContentEmpty(nodes: ProsemirrorData[]): boolean {
  return nodes.every(
    (node) =>
      node.type === "paragraph" && (!node.content || node.content.length === 0)
  );
}

function textContent(node: ProsemirrorData): string {
  if (node.text) {
    return node.text;
  }

  return node.content?.map(textContent).join("") ?? "";
}

function textLength(node: ProsemirrorData): number {
  return textContent(node).length;
}

function textLineWeight(node: ProsemirrorData, charsPerLine = 54): number {
  const length = textLength(node);

  if (length === 0) {
    return 0.5;
  }

  return Math.max(1, Math.ceil(length / charsPerLine));
}

function estimateNodeWeight(node: ProsemirrorData): number {
  switch (node.type) {
    case "heading":
      return 2.4 + textLineWeight(node, 38) * 0.8;

    case "paragraph":
      return textLineWeight(node);

    case "blockquote":
      return 1.5 + estimateContentWeight(node.content ?? []);

    case "bullet_list":
    case "ordered_list":
    case "checkbox_list":
      return 0.5 + estimateContentWeight(node.content ?? []);

    case "list_item":
    case "checkbox_item":
      return 0.6 + estimateContentWeight(node.content ?? []);

    case "code_block":
    case "code_fence":
      return 2 + Math.max(1, textContent(node).split("\n").length) * 0.85;

    case "math_block":
      return Math.max(3.5, textLineWeight(node, 36) * 1.6);

    case "image":
    case "attachment":
    case "embed":
      return 7;

    case "table":
      return 2 + (node.content?.length ?? 1) * 1.5;

    default:
      return node.content ? estimateContentWeight(node.content) : 1.5;
  }
}

function estimateContentWeight(nodes: ProsemirrorData[]): number {
  return nodes.reduce((acc, node) => acc + estimateNodeWeight(node), 0);
}

function cloneNodeWithContent(
  node: ProsemirrorData,
  content: ProsemirrorData[]
): ProsemirrorData {
  return {
    ...node,
    content,
  };
}

function chunkChildrenByWeight(
  node: ProsemirrorData,
  maxWeight: number,
  splitChildren = true
): ProsemirrorData[] {
  const children = node.content ?? [];

  if (children.length <= 1) {
    return [node];
  }

  const chunks: ProsemirrorData[] = [];
  let current: ProsemirrorData[] = [];
  let currentWeight = 0;

  const chunkableChildren = splitChildren
    ? children.flatMap((childNode) => splitOversizedNode(childNode, maxWeight))
    : children;

  for (const child of chunkableChildren) {
    const childWeight = estimateNodeWeight(child);

    if (current.length > 0 && currentWeight + childWeight > maxWeight) {
      chunks.push(cloneNodeWithContent(node, current));
      current = [];
      currentWeight = 0;
    }

    current.push(child);
    currentWeight += childWeight;
  }

  if (current.length > 0) {
    chunks.push(cloneNodeWithContent(node, current));
  }

  return chunks;
}

function splitOversizedNode(
  node: ProsemirrorData,
  maxWeight: number
): ProsemirrorData[] {
  if (estimateNodeWeight(node) <= maxWeight) {
    return [node];
  }

  switch (node.type) {
    case "bullet_list":
    case "ordered_list":
    case "checkbox_list":
      return chunkChildrenByWeight(node, maxWeight, false);

    case "blockquote":
      return chunkChildrenByWeight(node, maxWeight);

    case "table": {
      const rows = node.content ?? [];
      const header = rows[0];
      const bodyRows = rows.slice(1);

      if (!header || bodyRows.length <= 1) {
        return chunkChildrenByWeight(node, maxWeight);
      }

      const chunks = chunkChildrenByWeight(
        cloneNodeWithContent(node, bodyRows),
        maxWeight - estimateNodeWeight(header),
        false
      );

      return chunks.map((chunk) =>
        cloneNodeWithContent(node, [header, ...(chunk.content ?? [])])
      );
    }

    default:
      return [node];
  }
}

function paginateContent(nodes: ProsemirrorData[]): ProsemirrorData[][] {
  const pages: ProsemirrorData[][] = [];
  const expandedNodes = nodes.flatMap((node) =>
    splitOversizedNode(node, maxSlideWeight)
  );
  let current: ProsemirrorData[] = [];
  let currentWeight = 0;

  for (const node of expandedNodes) {
    const nodeWeight = estimateNodeWeight(node);
    const currentStartsWithHeading =
      current.length === 1 && current[0].type === "heading";

    if (
      current.length > 0 &&
      !currentStartsWithHeading &&
      currentWeight + nodeWeight > maxSlideWeight
    ) {
      pages.push(current);
      current = [];
      currentWeight = 0;
    }

    current.push(node);
    currentWeight += nodeWeight;
  }

  if (current.length > 0) {
    pages.push(current);
  }

  return pages;
}

function appendContentSlides(slides: Slide[], nodes: ProsemirrorData[]): void {
  for (const page of paginateContent(nodes)) {
    if (!isContentEmpty(page)) {
      slides.push({ type: "content", content: page });
    }
  }
}

/**
 * Splits a ProseMirror document into slides based on heading and divider nodes.
 * A dedicated title slide is prepended. Each h1/h2 heading or horizontal rule
 * starts a new content section. Long sections are further paginated by
 * estimated block height so list-heavy content does not overflow the viewport.
 * Divider nodes are consumed as separators and not rendered on slides.
 *
 * @param data the prosemirror document data.
 * @param title the document title.
 * @param icon the document icon.
 * @param iconColor the document icon color.
 * @returns an array of slides.
 */
function splitIntoSlides(
  data: ProsemirrorData,
  title: string,
  icon?: string | null,
  iconColor?: string | null
): Slide[] {
  const content = data.content ?? [];
  const slides: Slide[] = [{ type: "title", title, icon, iconColor }];
  let currentNodes: ProsemirrorData[] = [];

  for (const node of content) {
    const isDivider = node.type === "horizontal_rule" || node.type === "hr";
    const isHeadingBreak =
      node.type === "heading" &&
      node.attrs &&
      typeof node.attrs.level === "number" &&
      node.attrs.level <= 2;

    if (isDivider) {
      if (currentNodes.length > 0) {
        appendContentSlides(slides, currentNodes);
        currentNodes = [];
      }
      continue;
    }

    if (isHeadingBreak && currentNodes.length > 0) {
      appendContentSlides(slides, currentNodes);
      currentNodes = [];
    }

    currentNodes.push(node);
  }

  if (currentNodes.length > 0) {
    appendContentSlides(slides, currentNodes);
  }

  return slides;
}

/**
 * Full-screen presentation mode that splits a document into slides by headings
 * and dividers, and allows navigating through them with keyboard controls.
 */
function PresentationMode({ title, icon, iconColor, data, onClose }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [currentSlide, setCurrentSlide] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const slideContentRef = React.useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const supportsFullscreen = React.useMemo(() => canUseElementFullscreen(), []);
  const isIdle = useIdle(3000, idleEvents);

  const strippedData = React.useMemo(
    () =>
      ProsemirrorHelper.removeMarks(cloneDeep(data), [
        "comment",
      ]) as ProsemirrorData,
    [data]
  );

  const slides = React.useMemo(() => {
    const result = splitIntoSlides(strippedData, title, icon, iconColor);
    const contentSlides = result.filter((s) => s.type === "content");
    const hasContent = contentSlides.some(
      (s) => s.type === "content" && !isContentEmpty(s.content)
    );

    if (!hasContent) {
      return [result[0], { type: "instructions" as const }];
    }

    return result;
  }, [strippedData, title, icon, iconColor]);

  const totalSlides = slides.length;

  const goNext = React.useCallback(() => {
    setCurrentSlide((prev) => Math.min(prev + 1, totalSlides - 1));
  }, [totalSlides]);

  const goPrev = React.useCallback(() => {
    setCurrentSlide((prev) => Math.max(prev - 1, 0));
  }, []);

  const goFirst = React.useCallback(() => {
    setCurrentSlide(0);
  }, []);

  const goLast = React.useCallback(() => {
    setCurrentSlide(totalSlides - 1);
  }, [totalSlides]);

  const toggleFullscreen = React.useCallback(() => {
    if (!supportsFullscreen) {
      return;
    }

    const el = containerRef.current;
    if (!el) {
      return;
    }

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {
        // ignore
      });
    } else {
      el.requestFullscreen().catch(() => {
        // ignore
      });
    }
  }, [supportsFullscreen]);

  useKeyDown("Escape", onClose);
  useKeyDown("ArrowRight", goNext);
  useKeyDown("ArrowDown", goNext);
  useKeyDown("PageDown", goNext);
  useKeyDown("ArrowLeft", goPrev);
  useKeyDown("ArrowUp", goPrev);
  useKeyDown("PageUp", goPrev);
  useKeyDown("Home", goFirst);
  useKeyDown("End", goLast);
  useKeyDown(" ", goNext);
  useKeyDown("f", toggleFullscreen);

  // Prevent body scrolling while presentation is open
  React.useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Track fullscreen state changes
  React.useEffect(() => {
    if (!supportsFullscreen) {
      return;
    }

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {
          // ignore
        });
      }
    };
  }, [supportsFullscreen]);

  // Measure natural size once per slide, then apply scale directly to the DOM
  // to avoid React re-render loops during window resize.
  const naturalSize = React.useRef({ width: 0, height: 0 });

  React.useEffect(() => {
    const el = slideContentRef.current;
    const container = containerRef.current;
    if (!el || !container) {
      return;
    }

    const applyScale = () => {
      const { width, height } = naturalSize.current;
      if (width === 0 || height === 0) {
        el.style.transform = "scale(1)";
        return;
      }

      const availableWidth = container.clientWidth - 160;
      const availableHeight = container.clientHeight - 160;
      const scaleX = availableWidth / width;
      const scaleY = availableHeight / height;
      const newScale = Math.min(scaleX, scaleY, 1.5);
      el.style.transform = `scale(${Math.max(newScale, minPresentationScale)})`;
    };

    // Measure natural size with scale removed, then apply
    el.style.transform = "none";
    requestAnimationFrame(() => {
      naturalSize.current = {
        width: el.scrollWidth,
        height: el.scrollHeight,
      };
      applyScale();
      window.addEventListener("resize", applyScale);
    });

    return () => {
      window.removeEventListener("resize", applyScale);
    };
  }, [currentSlide]);

  const slide = slides[currentSlide];

  const slideData: ProsemirrorData | undefined = React.useMemo(
    () =>
      slide.type === "content"
        ? { type: "doc", content: slide.content }
        : undefined,
    [slide]
  );

  const extensions = React.useMemo(() => richExtensions, []);

  return createPortal(
    <Container ref={containerRef} $background={theme.background} $idle={isIdle}>
      <TopBar $idle={isIdle}>
        <Flex align="center" gap={12}>
          <Tooltip content={t("Previous slide")} delay={500}>
            <Button onClick={goPrev} disabled={currentSlide === 0}>
              <ArrowLeftIcon />
            </Button>
          </Tooltip>
          <SlideCounter>
            {currentSlide + 1} / {totalSlides}
          </SlideCounter>
          <Tooltip content={t("Next slide")} delay={500}>
            <Button
              onClick={goNext}
              disabled={currentSlide === totalSlides - 1}
            >
              <ArrowRightIcon color="currentColor" />
            </Button>
          </Tooltip>
        </Flex>
        <RightButtons>
          {supportsFullscreen && (
            <Tooltip content={t("Toggle fullscreen")} delay={500}>
              <Button onClick={toggleFullscreen}>
                {isFullscreen ? (
                  <ShrinkIcon color="currentColor" />
                ) : (
                  <GrowIcon color="currentColor" />
                )}
              </Button>
            </Tooltip>
          )}
          <Tooltip content={t("Close")} delay={500}>
            <Button onClick={onClose}>
              <CloseIcon />
            </Button>
          </Tooltip>
        </RightButtons>
      </TopBar>
      <SlideArea
        onClick={(event: React.MouseEvent) => {
          if (!(event.target as HTMLElement).closest("a")) {
            goNext();
          }
        }}
      >
        <SlideContent ref={slideContentRef}>
          {slide.type === "title" ? (
            <TitleSlide>
              {slide.icon && (
                <TitleIcon>
                  <Icon
                    value={slide.icon}
                    color={slide.iconColor ?? colorPalette[0]}
                    size={64}
                    initial={slide.title[0]}
                  />
                </TitleIcon>
              )}
              <TitleText>{slide.title}</TitleText>
            </TitleSlide>
          ) : slide.type === "instructions" ? (
            <InstructionSlide>
              <InstructionHeading>
                {t("Create your presentation")}
              </InstructionHeading>
              <InstructionBody>
                {t(
                  "Add content to your document, then use headings or dividers to separate it into slides."
                )}{" "}
                <a
                  href="https://docs.getoutline.com/s/guide/doc/present-mode-yMGzaY7A9L"
                  target="_blank"
                >
                  {t("Learn more")}
                </a>
                .
              </InstructionBody>
            </InstructionSlide>
          ) : slideData ? (
            <Editor
              key={currentSlide}
              defaultValue={slideData}
              extensions={extensions}
              readOnly
              grow={false}
              placeholder=""
            />
          ) : null}
        </SlideContent>
      </SlideArea>
    </Container>,
    document.body
  );
}

const Container = styled.div<{ $background: string; $idle: boolean }>`
  position: fixed;
  inset: 0;
  z-index: ${depths.presentation};
  background: ${(props) => props.$background};
  display: flex;
  flex-direction: column;
  user-select: none;
  cursor: ${(props) => (props.$idle ? "none" : "default")};

  * {
    cursor: inherit;
  }

  a[href] {
    cursor: ${(props) => (props.$idle ? "none" : "pointer")};
  }
`;

const SlideArea = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 80px;
`;

const SlideContent = styled.div`
  max-width: 960px;
  width: 100%;
  transform-origin: center center;

  .ProseMirror {
    padding: 0;
    font-size: 1.4em;
  }

  .image-wrapper,
  .image-wrapper img,
  .mermaid-diagram-wrapper {
    pointer-events: none !important;
  }

  h1 {
    font-size: 2.4em;
  }
  h2 {
    font-size: 1.8em;
  }
  h3 {
    font-size: 1.4em;
  }
`;

const TitleSlide = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 24px;
  min-height: 200px;
`;

const TitleIcon = styled.div`
  flex-shrink: 0;
`;

const TitleText = styled.h1`
  font-size: 3em;
  font-weight: 600;
  line-height: 1.25;
  margin: 0;
  color: ${s("text")};
`;

const TopBar = styled.div<{ $idle: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1;
  opacity: ${(props) => (props.$idle ? 0 : 1)};
  pointer-events: ${(props) => (props.$idle ? "none" : "auto")};
  transition: opacity 300ms ease;
`;

const SlideCounter = styled(Text)`
  font-variant-numeric: tabular-nums;
  color: ${s("textTertiary")};
  font-size: 14px;
  min-width: 60px;
  text-align: center;
`;

const RightButtons = styled(Flex).attrs({ align: "center", gap: 16 })`
  position: absolute;
  right: 16px;
`;

const Button = styled(NudeButton).attrs({ size: 32 })`
  &:not(:disabled) {
    color: ${s("textTertiary")};

    &:${hover},
    &:active {
      color: ${s("text")};
    }
  }

  &:disabled {
    color: ${s("textTertiary")};
    opacity: 0.5;
  }
`;

const InstructionSlide = styled(TitleSlide)`
  gap: 16px;
  max-width: 560px;
  margin: 0 auto;
`;

const InstructionHeading = styled.h2`
  font-size: 2em;
  font-weight: 600;
  margin: 0;
  color: ${s("text")};
`;

const InstructionBody = styled.p`
  font-size: 1.2em;
  line-height: 1.6;
  margin: 0;
  color: ${s("textSecondary")};
`;

export default PresentationMode;
