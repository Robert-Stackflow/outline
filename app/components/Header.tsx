import { observer } from "mobx-react";
import { MenuIcon } from "outline-icons";
import { transparentize } from "polished";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { mergeRefs } from "react-merge-refs";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import useMeasure from "react-use-measure";
import { depths, s } from "@shared/styles";
import { metaDisplay } from "@shared/utils/keyboard";
import Button from "~/components/Button";
import Fade from "~/components/Fade";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import useMobile from "~/hooks/useMobile";
import useStores from "~/hooks/useStores";
import useWindowScrollPosition from "~/hooks/useWindowScrollPosition";
import { draggableOnDesktop, fadeOnDesktopBackgrounded } from "~/styles";
import Desktop from "~/utils/Desktop";
import { useScrollContext } from "./ScrollContext";
import { TooltipProvider } from "./TooltipContext";

export const HEADER_HEIGHT = 64;

type Props = {
  left?: React.ReactNode;
  title: React.ReactNode;
  actions?:
    | ((props: { isCompact: boolean }) => React.ReactNode)
    | React.ReactNode;
  hasSidebar?: boolean;
  className?: string;
};

function Header(
  { left, title, actions, hasSidebar, className }: Props,
  ref: React.RefObject<HTMLDivElement> | null
) {
  const { ui } = useStores();
  const { t } = useTranslation();
  const isMobile = useMobile();
  const hasMobileSidebar = hasSidebar && isMobile;
  const [internalMeasureRef, size] = useMeasure();
  const [breadcrumbsMeasureRef, breadcrumbsSize] = useMeasure();
  const passThrough = !actions && !left && !title;
  const scrollRef = useScrollContext();
  const scrollPosition = useWindowScrollPosition({ throttle: 50 });
  const isScrolled = scrollPosition.y > 75;

  const handleClickTitle = React.useCallback(() => {
    const target = scrollRef?.current ?? window;
    target.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [scrollRef]);

  const setBreadcrumbRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (node?.firstElementChild) {
        breadcrumbsMeasureRef(node.firstElementChild as HTMLDivElement);
      }
    },
    [breadcrumbsMeasureRef]
  );

  const breadcrumbMakesCompact = breadcrumbsSize.width > size.width / 3;
  const isCompact = size.width < 1000 || breadcrumbMakesCompact;

  return (
    <TooltipProvider>
      <Wrapper
        ref={mergeRefs([ref, internalMeasureRef])}
        align="center"
        shrink={false}
        className={className}
        data-page-header=""
        $passThrough={passThrough}
        $insetTitleAdjust={ui.sidebarIsClosed && Desktop.hasInsetTitlebar()}
      >
        {left ||
        hasMobileSidebar ||
        (hasSidebar && !isMobile && ui.sidebarIsClosed) ? (
          <Breadcrumbs ref={setBreadcrumbRef}>
            {hasMobileSidebar && (
              <MobileMenuButton
                haptic="light"
                onClick={ui.toggleMobileSidebar}
                icon={<MenuIcon />}
                neutral
              />
            )}
            {hasSidebar && !isMobile && ui.sidebarIsClosed && (
              <>
                <Tooltip
                  content={t("Toggle sidebar")}
                  shortcut={`${metaDisplay}+.`}
                  placement="bottom"
                >
                  <ExpandSidebarButton
                    aria-label={t("Expand sidebar")}
                    onClick={() => {
                      ui.toggleCollapsedSidebar();
                      (document.activeElement as HTMLElement)?.blur();
                    }}
                  >
                    <MenuIcon />
                  </ExpandSidebarButton>
                </Tooltip>
                {left && <ExpandDivider aria-hidden />}
              </>
            )}
            {left}
          </Breadcrumbs>
        ) : null}

        {isScrolled && !isCompact ? (
          <Title onClick={handleClickTitle}>
            <Fade>{title}</Fade>
          </Title>
        ) : (
          <div />
        )}
        <Actions align="center" justify="flex-end">
          {typeof actions === "function" ? actions({ isCompact }) : actions}
        </Actions>
      </Wrapper>
    </TooltipProvider>
  );
}

const Breadcrumbs = styled("div")`
  flex-grow: 1;
  flex-basis: 0;
  min-width: 0;
  align-items: center;
  padding-inline: 0 8px;
  margin-inline-start: -4px;
  display: flex;

  ${breakpoint("tablet")`
    min-width: auto;
  `};
`;

const Actions = styled(Flex)`
  flex-grow: 1;
  flex-basis: 0;
  min-width: auto;
  padding-inline: 8px 0;
  gap: 6px;
  margin-inline-start: 8px;

  /* Unify every button in the actions row to a flat, borderless icon-button
     style that matches the breadcrumb on the left. The Outline default
     "neutral" Button paints a 1px inset border + chrome that visually
     clashes with the bare icon controls living right next to it. */
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent !important;
    box-shadow: none !important;
    border: 0 !important;
    min-width: 30px;
    min-height: 30px;
    height: 30px;
    flex-shrink: 0;
    border-radius: 6px;
    color: ${s("textSecondary")};
    font-weight: 500;
    transition:
      background 120ms ease,
      color 120ms ease;

    &:hover:not(:disabled),
    &:active:not(:disabled),
    &:focus-visible:not(:disabled),
    &[aria-expanded="true"] {
      background: ${s("listItemHoverBackground")} !important;
      color: ${s("text")};
    }

    &:disabled {
      color: ${s("textTertiary")};
      opacity: 0.6;
    }

  }

  /* Slightly more breathing room around the divider that separates the
     avatar facepile from the action buttons. */
  hr,
  & > div[role="separator"],
  > .separator {
    margin-inline: 4px;
  }

  ${breakpoint("tablet")`
    position: unset;
  `};
`;

type WrapperProps = {
  $passThrough?: boolean;
  $insetTitleAdjust?: boolean;
};

const Wrapper = styled(Flex)<WrapperProps>`
  top: 0;
  z-index: ${depths.header};
  position: sticky;
  background: ${s("background")};

  ${(props) =>
    props.$passThrough
      ? `
      background: transparent;
      pointer-events: none;
      `
      : `
      background: ${transparentize(0.2, props.theme.background)};
      backdrop-filter: blur(20px);
      `};

  padding: 12px 16px;
  transform: translate3d(0, 0, 0);
  min-height: ${HEADER_HEIGHT}px;
  justify-content: flex-start;
  ${draggableOnDesktop()}

  button,
  [role="button"] {
    ${fadeOnDesktopBackgrounded()}
  }

  @supports (backdrop-filter: blur(20px)) {
    backdrop-filter: blur(20px);
    background: ${(props) => transparentize(0.2, props.theme.background)};
  }

  @media print {
    display: none;
  }

  ${breakpoint("tablet")`
    padding: 16px;
    ${(props: WrapperProps) => props.$insetTitleAdjust && `padding-left: 64px;`}
    `};
`;

const Title = styled("div")`
  display: none;
  font-size: 14px;
  font-weight: 500;
  color: ${s("text")};
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  cursor: var(--pointer);
  min-width: 0;

  ${breakpoint("tablet")`
    padding-left: 0;
    display: block;
  `};

  svg {
    vertical-align: bottom;
  }

  @media (display-mode: standalone) {
    overflow: hidden;
    flex-grow: 0 !important;
  }
`;

const MobileMenuButton = styled(Button)`
  margin-right: 8px;
  pointer-events: auto;

  @media print {
    display: none;
  }
`;

const ExpandSidebarButton = styled(NudeButton)`
  pointer-events: auto;
  width: 30px;
  height: 30px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${s("textTertiary")};
  transition:
    background 120ms ease,
    color 120ms ease;

  &:hover,
  &:active,
  &:focus-visible,
  &[aria-expanded="true"] {
    background: ${s("listItemHoverBackground")};
    color: ${s("text")};
  }

  svg {
    width: 20px;
    height: 20px;
  }

  @media print {
    display: none;
  }
`;

const ExpandDivider = styled.span`
  display: inline-block;
  width: 1px;
  height: 20px;
  margin: 0 10px 0 8px;
  background: ${s("divider")};

  @media print {
    display: none;
  }
`;

export default observer(React.forwardRef(Header));
