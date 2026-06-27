import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import KeyboardShortcuts from "~/scenes/KeyboardShortcuts";
import useStores from "~/hooks/useStores";
import Sidebar from "../SidebarLayout";

/**
 * Renders the keyboard shortcuts reference inside the right sidebar panel
 * (rather than a center drawer), matching the AI and comments panels. Manages
 * its own internal scroll so the page itself never scrolls.
 */
function KeyboardShortcutsPanel() {
  const { t } = useTranslation();
  const { ui } = useStores();

  return (
    <Sidebar
      title={t("Keyboard shortcuts")}
      onClose={() => ui.set({ rightSidebar: null })}
      scrollable={false}
    >
      <Scroll>
        <KeyboardShortcuts />
      </Scroll>
    </Sidebar>
  );
}

const Scroll = styled.div`
  height: 100%;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 16px;
  background: ${s("background")};
`;

export default observer(KeyboardShortcutsPanel);
