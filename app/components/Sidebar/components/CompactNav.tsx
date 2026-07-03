import { HomeIcon, SearchIcon, SparklesIcon } from "outline-icons";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import NotificationIcon from "~/components/Notifications/NotificationIcon";
import Tooltip from "~/components/Tooltip";
import useStores from "~/hooks/useStores";
import { useSidebarPanel } from "./SidebarPanelContext";
import { shouldShowAiEntry } from "./sidebarPanelRouting";

/**
 * Notion-style compact horizontal navigation: Home / Notifications act as
 * sidebar panel toggles (driving what renders below in the same column), while
 * Search opens the dedicated global search dialog (independent from the kbar
 * command palette). The active toggle expands into a labeled pill with a smooth
 * icon→label animation.
 */
function CompactNav() {
  const { t } = useTranslation();
  const { ai, ui } = useStores();
  const { panel, setPanel } = useSidebarPanel();
  const showAiEntry = shouldShowAiEntry(ai.config);

  const handleSearch = React.useCallback(() => {
    ui.openSearchDialog();
  }, [ui]);

  return (
    <Row>
      <Pill
        type="button"
        $active={panel === "home"}
        onClick={() => setPanel("home")}
        aria-pressed={panel === "home"}
        aria-label={t("Home")}
      >
        <IconBox>
          <HomeIcon />
        </IconBox>
        <Label $active={panel === "home"}>{t("Home")}</Label>
      </Pill>

      <Tooltip
        content={t("Notifications")}
        placement="bottom"
        disabled={panel === "notifications"}
      >
        <Pill
          type="button"
          $active={panel === "notifications"}
          onClick={() => setPanel("notifications")}
          aria-pressed={panel === "notifications"}
          aria-label={t("Notifications")}
        >
          <IconBox>
            <NotificationIcon />
          </IconBox>
          <Label $active={panel === "notifications"}>
            {t("Notifications")}
          </Label>
        </Pill>
      </Tooltip>

      {showAiEntry && (
        <Tooltip content={t("AI")} placement="bottom" disabled={panel === "ai"}>
          <Pill
            type="button"
            $active={panel === "ai"}
            onClick={() => setPanel("ai")}
            aria-pressed={panel === "ai"}
            aria-label={t("AI")}
          >
            <IconBox>
              <SparklesIcon />
            </IconBox>
            <Label $active={panel === "ai"}>{t("AI")}</Label>
          </Pill>
        </Tooltip>
      )}

      <Spacer />
      <Tooltip content={t("Search")} placement="bottom" shortcut="/">
        <Pill
          type="button"
          $active={false}
          onClick={handleSearch}
          aria-label={t("Search")}
        >
          <IconBox>
            <SearchIcon />
          </IconBox>
        </Pill>
      </Tooltip>
    </Row>
  );
}

const Row = styled.div`
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px 8px;
  background: ${s("sidebarBackground")};
`;

const Spacer = styled.span`
  flex: 1;
`;

const Pill = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  height: 30px;
  padding: ${(props) => (props.$active ? "0 10px 0 8px" : "0 6px")};
  border-radius: 8px;
  cursor: var(--pointer);
  overflow: hidden;
  text-decoration: none;
  border: 0;
  appearance: none;
  color: ${(props) =>
    props.$active ? props.theme.text : props.theme.textTertiary};
  background: ${(props) =>
    props.$active ? props.theme.sidebarActiveBackground : "transparent"};
  transition:
    background 220ms cubic-bezier(0.32, 0.72, 0, 1),
    color 180ms ease,
    padding 220ms cubic-bezier(0.32, 0.72, 0, 1);

  &:hover {
    background: ${(props) =>
      props.$active
        ? props.theme.sidebarActiveBackground
        : props.theme.sidebarHoverBackground};
    color: ${s("text")};
  }
`;

const IconBox = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;

  svg {
    width: 20px;
    height: 20px;
  }
`;

const Label = styled.span<{ $active: boolean }>`
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  margin-left: ${(props) => (props.$active ? 6 : 0)}px;
  max-width: ${(props) => (props.$active ? 200 : 0)}px;
  opacity: ${(props) => (props.$active ? 1 : 0)};
  overflow: hidden;
  transition:
    max-width 240ms cubic-bezier(0.32, 0.72, 0, 1),
    margin-left 240ms cubic-bezier(0.32, 0.72, 0, 1),
    opacity 180ms ease ${(props) => (props.$active ? "60ms" : "0ms")};
`;

export default observer(CompactNav);
