import { AnimatePresence } from "framer-motion";
import { observer } from "mobx-react";
import * as React from "react";
import { Helmet } from "react-helmet-async";
import type { DefaultTheme } from "styled-components";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s } from "@shared/styles";
import Flex from "~/components/Flex";
import { LoadingIndicatorBar } from "~/components/LoadingIndicator";
import { useRightSidebarContent } from "~/components/RightSidebarContext";
import ScrollContext from "~/components/ScrollContext";
import SkipNavContent from "~/components/SkipNavContent";
import SkipNavLink from "~/components/SkipNavLink";
import env from "~/env";
import useMobile from "~/hooks/useMobile";
import useStores from "~/hooks/useStores";

type Props = {
  /** Main content to render in the layout. */
  children?: React.ReactNode;
  /** Page title to display in the browser tab. Defaults to app name if not provided. */
  title?: string;
  /** Left sidebar content. */
  sidebar?: React.ReactNode;
  /** Whether the sidebar can be collapsed, defaults to true. */
  sidebarCanCollapse?: boolean;
};

const Layout = React.forwardRef(function Layout_(
  { title, children, sidebar, sidebarCanCollapse = true }: Props,
  ref: React.RefObject<HTMLDivElement>
) {
  const { ui } = useStores();
  const isMobile = useMobile();
  const contentRef = React.useRef<HTMLDivElement>(null);
  const sidebarCollapsed =
    !sidebar || (ui.sidebarIsClosed && sidebarCanCollapse);
  const sidebarRight = useRightSidebarContent();

  const body = (
    <Body auto>
      {sidebar}

      <SkipNavContent />
      <Content
        ref={contentRef}
        auto
        justify="center"
        role="main"
        $isResizing={ui.sidebarIsResizing}
        $sidebarCollapsed={sidebarCollapsed}
        $hasSidebar={!!sidebar}
        style={
          sidebarCollapsed
            ? undefined
            : {
                marginInlineStart: `${ui.sidebarWidth}px`,
              }
        }
      >
        {children}
      </Content>

      <AnimatePresence initial={false}>{sidebarRight}</AnimatePresence>
    </Body>
  );

  return (
    <Container column auto ref={ref}>
      <Helmet>
        <title>{title ? title : env.APP_NAME}</title>
      </Helmet>

      <SkipNavLink />

      {ui.progressBarVisible && <LoadingIndicatorBar />}

      {/* On desktop the main content is its own scroll container so its
          scrollbar sits at the content edge rather than the window edge (which
          would otherwise stack beside the right sidebar's scrollbar). On mobile
          the ancestor PageScroll owns scrolling, so don't override the context. */}
      {isMobile ? (
        body
      ) : (
        <ScrollContext.Provider value={contentRef}>
          {body}
        </ScrollContext.Provider>
      )}
    </Container>
  );
});

const Container = styled(Flex)`
  background: ${s("background")};
  position: relative;
  width: 100%;
  min-height: 100%;

  ${breakpoint("tablet")`
    height: 100vh;
  `}
`;

const Body = styled(Flex)`
  flex: 1;
  min-height: 0;

  ${breakpoint("tablet")`
    overflow: hidden;
  `}
`;

type ContentProps = {
  $isResizing?: boolean;
  $sidebarCollapsed?: boolean;
  $hasSidebar?: boolean;
  theme: DefaultTheme;
};

const Content = styled(Flex)<ContentProps>`
  margin: 0;
  transition: ${(props) =>
    props.$isResizing ? "none" : `margin-inline-start 100ms ease-out`};

  @media print {
    margin: 0 !important;
  }

  ${breakpoint("mobile", "tablet")`
    margin-inline-start: 0 !important;
  `}

  ${breakpoint("tablet")`
    ${(props: ContentProps) =>
      props.$hasSidebar &&
      props.$sidebarCollapsed &&
      `margin-inline-start: ${props.theme.sidebarCollapsedWidth}px;`}

    /* The main content scrolls within itself so its scrollbar sits at the
       content edge, leaving the right sidebar to manage its own scroll. */
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
  `};
`;

export default observer(Layout);
