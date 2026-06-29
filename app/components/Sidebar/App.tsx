import { observer } from "mobx-react";
import {
  ArchiveIcon,
  DraftsIcon,
  HomeIcon,
  SidebarIcon,
  SidebarReverseIcon,
} from "outline-icons";
import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  DragActiveProvider,
  SidebarScrollProvider,
} from "./components/DragActiveContext";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import { metaDisplay } from "@shared/utils/keyboard";
import { undraggableOnDesktop } from "~/styles";
import { AvatarSize } from "~/components/Avatar";
import Scrollable from "~/components/Scrollable";
import Notifications from "~/components/Notifications/Notifications";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import TeamMenu from "~/menus/TeamMenu";
import {
  archivePath,
  aiPath,
  draftsPath,
  homePath,
} from "~/utils/routeHelpers";
import TeamLogo from "../TeamLogo";
import Tooltip from "../Tooltip";
import Sidebar from "./Sidebar";
import Collections from "./components/Collections";
import CompactNav from "./components/CompactNav";
import AiPanel from "./components/AiPanel";
import DragPlaceholder from "./components/DragPlaceholder";
import HistoryNavigation from "./components/HistoryNavigation";
import Section from "./components/Section";
import SharedWithMe from "./components/SharedWithMe";
import SidebarLink from "./components/SidebarLink";
import {
  SidebarPanelProvider,
  useSidebarPanel,
} from "./components/SidebarPanelContext";
import {
  getSidebarPanelAfterRouteChange,
  getSidebarScrollAreaForPanel,
  shouldShowAiEntry,
} from "./components/sidebarPanelRouting";
import Starred from "./components/Starred";
import TrashEntry from "./components/TrashEntry";
import useMobile from "~/hooks/useMobile";

function AppSidebar() {
  const { t } = useTranslation();
  const { ai, documents, ui, collections } = useStores();
  const team = useCurrentTeam();
  const user = useCurrentUser();
  const isMobile = useMobile();

  useEffect(() => {
    void collections.fetchAll();

    if (!user.isViewer) {
      void documents.fetchDrafts();
    }
  }, [documents, collections, user.isViewer]);

  useEffect(() => {
    if (!ai.config) {
      void ai.fetchConfig();
    }
  }, [ai]);

  // Scrollable reads ref.current internally for its shadow/ResizeObserver
  // logic, so we must pass an object ref — a callback ref would leave those
  // reads undefined. We mirror the attached node into state so the
  // SidebarScrollProvider can re-render descendants with the scroll element.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollArea, setScrollArea] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setScrollArea(scrollRef.current);
  }, []);

  return (
    <Sidebar hidden={!ui.readyToShow}>
      <SidebarPanelProvider>
        <SidebarPanelRouteSync />
        <DragActiveProvider>
          <DragPlaceholder />

          <WorkspaceRow>
            <TeamMenu>
              <WorkspaceTrigger type="button" aria-label={team.name}>
                <TeamLogo
                  model={team}
                  size={AvatarSize.Medium}
                  alt={t("Logo")}
                />
                <WorkspaceName>{team.name}</WorkspaceName>
                {!isMobile && (
                  <Tooltip
                    content={t("Toggle sidebar")}
                    shortcut={`${metaDisplay}+.`}
                  >
                    <CollapseSlot
                      onPointerDown={(event: React.PointerEvent) => {
                        // Radix DropdownMenu opens on pointerdown; stop here so
                        // the trigger doesn't see the event.
                        event.stopPropagation();
                      }}
                      onMouseDown={(event: React.MouseEvent) => {
                        event.stopPropagation();
                      }}
                      onClick={(event: React.MouseEvent) => {
                        event.stopPropagation();
                        ui.toggleCollapsedSidebar();
                        (document.activeElement as HTMLElement)?.blur();
                      }}
                      aria-label={
                        ui.sidebarCollapsed
                          ? t("Expand sidebar")
                          : t("Collapse sidebar")
                      }
                    >
                      {ui.sidebarIsClosed ? (
                        <SidebarReverseIcon />
                      ) : (
                        <SidebarIcon />
                      )}
                    </CollapseSlot>
                  </Tooltip>
                )}
              </WorkspaceTrigger>
            </TeamMenu>
          </WorkspaceRow>
          <Overflow>
            <CompactNav />
          </Overflow>
          <PanelBody
            scrollRef={scrollRef}
            scrollArea={scrollArea}
            onScrollAreaChange={setScrollArea}
          />
        </DragActiveProvider>
      </SidebarPanelProvider>
      <HistoryNavigation />
    </Sidebar>
  );
}

/** Renders the sidebar body matching the active CompactNav panel. */
const PanelBody = observer(function PanelBody_({
  scrollRef,
  scrollArea,
  onScrollAreaChange,
}: {
  scrollRef: React.RefObject<HTMLDivElement>;
  scrollArea: HTMLElement | null;
  onScrollAreaChange: (scrollArea: HTMLElement | null) => void;
}) {
  const { t } = useTranslation();
  const { panel, setPanel } = useSidebarPanel();
  const { ai, auth, documents } = useStores();
  const can = usePolicy(auth.team?.id);

  useLayoutEffect(() => {
    onScrollAreaChange(
      getSidebarScrollAreaForPanel({
        panel,
        scrollArea: scrollRef.current,
      })
    );

    return () => {
      if (panel === "home") {
        onScrollAreaChange(null);
      }
    };
  }, [onScrollAreaChange, panel, scrollRef]);

  if (panel === "notifications") {
    return (
      <Scrollable flex shadow ref={scrollRef}>
        <Notifications onRequestClose={() => setPanel("home")} />
      </Scrollable>
    );
  }

  if (panel === "ai" && shouldShowAiEntry(ai.config)) {
    return <AiPanel />;
  }

  return (
    <Scrollable flex shadow ref={scrollRef}>
      <SidebarScrollProvider value={scrollArea}>
        <Section>
          <SidebarLink to={homePath()} icon={<HomeIcon />} label={t("Home")} />
          {can.createDocument && (
            <SidebarLink
              to={draftsPath()}
              icon={<DraftsIcon />}
              label={
                <DraftLabel>
                  <span>{t("Drafts")}</span>
                  {documents.totalDrafts > 0 && (
                    <DraftBadge>
                      {documents.totalDrafts > 25
                        ? "25+"
                        : documents.totalDrafts}
                    </DraftBadge>
                  )}
                </DraftLabel>
              }
            />
          )}
          {can.createDocument && (
            <SidebarLink
              to={archivePath()}
              icon={<ArchiveIcon />}
              label={t("Archive")}
            />
          )}
          {can.createDocument && <TrashEntry />}
        </Section>
        <Section>
          <Starred />
        </Section>
        <Section>
          <SharedWithMe />
        </Section>
        <Section auto>
          <Collections />
        </Section>
      </SidebarScrollProvider>
    </Scrollable>
  );
});

/** Keeps the compact sidebar panel in sync with AI availability and route exits. */
const SidebarPanelRouteSync = observer(function SidebarPanelRouteSync_() {
  const { ai } = useStores();
  const { panel, setPanel } = useSidebarPanel();
  const location = useLocation();
  const previousPathname = useRef(location.pathname);
  const handledAiRoute = useRef(false);
  const showAiEntry = shouldShowAiEntry(ai.config);

  useEffect(() => {
    const isAiRoute = location.pathname === aiPath();
    if (!isAiRoute) {
      handledAiRoute.current = false;
    }
    if (isAiRoute && showAiEntry && panel === "ai") {
      handledAiRoute.current = true;
    }

    const nextPanel = getSidebarPanelAfterRouteChange({
      panel,
      previousPathname: previousPathname.current,
      pathname: location.pathname,
      aiPathname: aiPath(),
      showAiEntry,
      aiRouteHandled: handledAiRoute.current,
    });

    previousPathname.current = location.pathname;

    if (nextPanel !== panel) {
      setPanel(nextPanel);
    }
  }, [location.pathname, panel, setPanel, showAiEntry]);

  return null;
});

const Overflow = styled.div`
  overflow: hidden;
  flex-shrink: 0;
`;

/**
 * Notion-style hover-revealed slot for the collapse button. Hidden by default
 * so the workspace header stays clean; reveals when the user hovers anywhere
 * in the workspace row.
 */
const CollapseSlot = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-inline-start: auto;
  border-radius: 4px;
  color: ${s("textTertiary")};
  opacity: 0;
  transition:
    opacity 150ms ease,
    background 120ms ease,
    color 120ms ease;
  cursor: var(--pointer);

  &:hover {
    background: ${s("sidebarHoverBackground")};
    color: ${s("text")};
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const WorkspaceTrigger = styled.button`
  appearance: none;
  display: flex;
  align-items: center;
  gap: 8px;
  width: calc(100% - 16px);
  margin: 8px;
  padding: 4px 6px;
  background: transparent;
  border: 0;
  border-radius: 6px;
  color: ${s("text")};
  cursor: var(--pointer);
  text-align: start;
  user-select: none;
  ${undraggableOnDesktop()}
  transition: background 120ms ease;

  &:hover,
  &[aria-expanded="true"] {
    background: ${s("sidebarHoverBackground")};
  }
`;

const WorkspaceName = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 500;
  color: ${s("text")};
`;

const WorkspaceRow = styled.div`
  &:hover ${CollapseSlot}, &:focus-within ${CollapseSlot} {
    opacity: 1;
  }
`;

const DraftLabel = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 8px;
`;

const DraftBadge = styled.span`
  font-size: 11px;
  line-height: 16px;
  min-width: 18px;
  padding: 0 6px;
  border-radius: 10px;
  background: ${s("sidebarHoverBackground")};
  color: ${s("textTertiary")};
  text-align: center;
`;

export default observer(AppSidebar);
