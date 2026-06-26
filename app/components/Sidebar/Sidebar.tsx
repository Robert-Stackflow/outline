import { observer } from "mobx-react";
import * as React from "react";
import { mergeRefs } from "react-merge-refs";
import { useWebHaptics } from "web-haptics/react";
import { useLocation } from "react-router-dom";
import styled, { css, useTheme } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { depths, s } from "@shared/styles";
import Flex from "~/components/Flex";
import useMobile from "~/hooks/useMobile";
import usePrevious from "~/hooks/usePrevious";
import useStores from "~/hooks/useStores";
import { fadeOnDesktopBackgrounded } from "~/styles";
import { fadeIn } from "~/styles/animations";
import { TooltipProvider } from "../TooltipContext";
import ResizeBorder from "./components/ResizeBorder";
import ToggleButton from "./components/ToggleButton";
import { useDirection } from "@radix-ui/react-direction";
import { HEADER_HEIGHT } from "~/components/Header";

const ANIMATION_MS = 250;

type Props = {
  /** Whether to hide the sidebar content (sets opacity to 0). */
  hidden?: boolean;
  /** Whether the sidebar can be collapsed, defaults to true. */
  canCollapse?: boolean;
  /** CSS class name(s) to apply to the sidebar container. */
  className?: string;
  /** Content to render inside the sidebar. */
  children: React.ReactNode;
};

const Sidebar = React.forwardRef<HTMLDivElement, Props>(function Sidebar_(
  { children, hidden = false, canCollapse = true, className }: Props,
  ref: React.RefObject<HTMLDivElement>
) {
  const theme = useTheme();
  const { ui } = useStores();
  const location = useLocation();
  const previousLocation = usePrevious(location);
  const isMobile = useMobile();
  const width = ui.sidebarWidth;
  const collapsed = ui.sidebarIsClosed && canCollapse;
  const maxWidth = theme.sidebarMaxWidth;
  const minWidth = theme.sidebarMinWidth + 16; // padding
  const { trigger } = useWebHaptics();
  const direction = useDirection();

  const [offset, setOffset] = React.useState(0);
  const [isHovering, setHovering] = React.useState(false);
  const [isAnimating, setAnimating] = React.useState(false);
  const [isResizing, setResizing] = React.useState(false);
  const [hasPointerMoved, setPointerMoved] = React.useState(false);
  const isSmallerThanMinimum = width < minWidth;
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const internalRef = React.useRef<HTMLDivElement | null>(null);
  const mergedRef = React.useMemo(() => mergeRefs([internalRef, ref]), [ref]);

  const handleDrag = React.useCallback(
    (event: MouseEvent) => {
      // suppresses text selection
      event.preventDefault();
      const rawWidth =
        direction === "rtl" ? offset - event.pageX : event.pageX - offset;
      // Clamp between the minimum and maximum widths. Dragging no longer
      // collapses the sidebar — it simply stops at the minimum width.
      const newWidth = Math.min(Math.max(rawWidth, minWidth), maxWidth);
      ui.set({ sidebarWidth: newWidth });
    },
    [ui, offset, minWidth, maxWidth, direction]
  );

  const handleStopDrag = React.useCallback(() => {
    setResizing(false);

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    ui.set({ sidebarWidth: width });
  }, [ui, width]);

  const handleBlur = React.useCallback(() => {
    setHovering(false);
  }, []);

  const handleMouseDown = React.useCallback(
    (event) => {
      event.preventDefault();
      if (!document.hasFocus()) {
        return;
      }

      setOffset(
        direction === "rtl" ? event.pageX + width : event.pageX - width
      );
      setResizing(true);
      setAnimating(false);
    },
    [width, direction]
  );

  const handlePointerActivity = React.useCallback(() => {
    if (ui.isReadingMode) {
      return;
    }
    if (ui.sidebarIsClosed) {
      // clear the timeout when mouse exits
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      setHovering(document.hasFocus());
      setPointerMoved(true);
    }
  }, [ui.sidebarIsClosed, ui.isReadingMode]);

  const handlePointerLeave = React.useCallback(
    (ev) => {
      if (hasPointerMoved) {
        // clear any previous timeout
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }

        // a short delay when the mouse exits the sidebar before closing, so a
        // brief overshoot does not collapse it, but it stays responsive.
        hoverTimeoutRef.current = setTimeout(() => {
          const withinSidebar =
            direction === "rtl"
              ? ev.pageX > window.innerWidth - width
              : ev.pageX < width;

          setHovering(
            document.hasFocus() &&
              withinSidebar &&
              ev.pageY < window.innerHeight &&
              ev.pageY > 0
          );
        }, 120);
      }
    },
    [width, direction, hasPointerMoved]
  );

  React.useEffect(() => {
    if (ui.sidebarIsClosed) {
      setHovering(false);
      setPointerMoved(false);
    }
  }, [ui.sidebarIsClosed]);

  // Reading mode forces the drawer to stay closed regardless of pointer.
  React.useEffect(() => {
    if (ui.isReadingMode) {
      setHovering(false);
      setPointerMoved(false);
    }
  }, [ui.isReadingMode]);

  // Reset stale hover state when the sidebar becomes visible after being
  // hidden via display:none (e.g. returning from settings). Without this, a
  // pointer-leave event never fires when navigating away while hovering, so
  // isHovering stays true and the sidebar appears expanded until the cursor
  // re-enters and leaves.
  React.useEffect(() => {
    const el = internalRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      return;
    }
    let wasVisible = false;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const nowVisible = entry.isIntersecting;
        if (nowVisible && !wasVisible) {
          setHovering(false);
          setPointerMoved(false);
        }
        wasVisible = nowVisible;
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (isAnimating) {
      setTimeout(() => setAnimating(false), ANIMATION_MS);
    }
  }, [isAnimating]);

  React.useEffect(() => {
    if (isResizing) {
      document.body.style.cursor = "col-resize";
      document.addEventListener("mousemove", handleDrag);
      document.addEventListener("mouseup", handleStopDrag);
    } else {
      document.body.style.cursor = "initial";
    }

    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("mousemove", handleDrag);
      document.removeEventListener("mouseup", handleStopDrag);
    };
  }, [isResizing, handleDrag, handleBlur, handleStopDrag]);

  const handleReset = React.useCallback(() => {
    ui.set({ sidebarWidth: theme.sidebarWidth });
  }, [ui, theme.sidebarWidth]);

  React.useEffect(() => {
    ui.setSidebarResizing(isResizing);
  }, [ui, isResizing]);

  React.useEffect(() => {
    if (location !== previousLocation) {
      ui.hideMobileSidebar();
    }
  }, [ui, location, previousLocation]);

  const style = React.useMemo(
    () => ({
      width: `${width}px`,
    }),
    [width]
  );

  const handleCloseSidebar = () => {
    void trigger("light");
    ui.toggleMobileSidebar();
  };

  return (
    <TooltipProvider>
      <Container
        id="sidebar"
        ref={mergedRef}
        style={style}
        $hidden={hidden}
        $isHovering={isHovering}
        $isAnimating={isAnimating}
        $isSmallerThanMinimum={isSmallerThanMinimum}
        $mobileSidebarVisible={ui.mobileSidebarVisible}
        $collapsed={collapsed}
        $isMobile={isMobile}
        className={className}
        onPointerDown={handlePointerActivity}
        onPointerMove={handlePointerActivity}
        onPointerLeave={handlePointerLeave}
        column
      >
        {children}

        <ResizeBorder
          onMouseDown={handleMouseDown}
          onDoubleClick={ui.sidebarIsClosed ? undefined : handleReset}
        />
      </Container>
      {ui.mobileSidebarVisible && <Backdrop onClick={handleCloseSidebar} />}
      {collapsed && !isMobile && !ui.isReadingMode && (
        <EdgeTrigger
          aria-hidden
          onMouseEnter={() => setHovering(true)}
        />
      )}
    </TooltipProvider>
  );
});

// A wide invisible zone along the start edge that reveals the collapsed sidebar
// on hover. Starts below the header so hovering near the header controls does
// not pop the drawer, and is wide enough to be easy to trigger.
const EdgeTrigger = styled.div`
  position: fixed;
  top: ${HEADER_HEIGHT}px;
  bottom: 0;
  inset-inline-start: 0;
  width: 40px;
  z-index: ${depths.sidebar + 1};

  @media print {
    display: none;
  }
`;

const Backdrop = styled.a`
  animation: ${fadeIn} 250ms ease-in-out;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  cursor: default;
  z-index: ${depths.mobileSidebar - 1};
  background: ${s("backdrop")};
`;

type ContainerProps = {
  $mobileSidebarVisible: boolean;
  $isAnimating: boolean;
  $isSmallerThanMinimum: boolean;
  $isHovering: boolean;
  $collapsed: boolean;
  $hidden: boolean;
  $isMobile: boolean;
};

const hoverStyles = (props: ContainerProps) => `
  transform: none !important;
  box-shadow: ${
    props.$collapsed
      ? "0 0 0 1px rgba(0, 0, 0, 0.04), 8px 0 28px rgba(0, 0, 0, 0.14)"
      : props.$isSmallerThanMinimum
        ? "rgba(0, 0, 0, 0.08) inset -1px 0 2px"
        : "none"
  };

  ${ToggleButton} {
    opacity: 1;
  }
`;

const Container = styled(Flex)<ContainerProps>`
  position: fixed;
  top: 0;
  bottom: 0;
  inset-inline-start: 0;
  width: 100%;
  background: ${s("sidebarBackground")};
  transition:
    box-shadow 150ms ease-in-out,
    transform 250ms cubic-bezier(0.34, 1.15, 0.64, 1)
      ${(props: ContainerProps) =>
        props.$isAnimating ? `, width ${ANIMATION_MS}ms ease-out` : ""};
  transform: translateX(
    ${(props) => (props.$mobileSidebarVisible ? 0 : "-100%")}
  );
  z-index: ${depths.mobileSidebar};
  max-width: 80%;
  min-width: 280px;
  padding-inline-start: var(--sal);
  ${fadeOnDesktopBackgrounded()}

  [dir="rtl"] & {
    transform: translateX(
      ${(props) => (props.$mobileSidebarVisible ? 0 : "100%")}
    );
  }

  @media print {
    display: none;
    transform: none;
  }

  & > div {
    transition: opacity 150ms ease-in-out;
    opacity: ${(props) => {
      if (props.$hidden) {
        return "0";
      }
      if (props.$isHovering) {
        return "1";
      }
      if (props.$isMobile) {
        return props.$mobileSidebarVisible ? "1" : "0";
      } else {
        return props.$collapsed ? "0" : "1";
      }
    }};
  }

  ${breakpoint("tablet")`
    z-index: ${(props: ContainerProps) =>
      props.$isHovering ? depths.sidebar + 5 : depths.sidebar};
    margin: 0;
    min-width: 0;
    transition:
      box-shadow 150ms ease-in-out,
      transform 150ms ease-out${(props: ContainerProps) =>
        props.$isAnimating ? `, width ${ANIMATION_MS}ms ease-out` : ""};
    transform: translateX(${(props: ContainerProps) =>
      props.$collapsed ? `-100%` : 0});

    [dir="rtl"] & {
      transform: translateX(${(props: ContainerProps) =>
        props.$collapsed ? `100%` : 0});
    }

    ${(props: ContainerProps) => props.$isHovering && css(hoverStyles)}

    &:hover {
      ${ToggleButton} {
        opacity: 1;
      }
    }

    &:focus-within {
      ${hoverStyles}

      & > div {
        opacity: 1;
      }
    }
  `};
`;

export default observer(Sidebar);
