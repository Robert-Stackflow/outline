import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import KeyboardShortcuts from "~/scenes/KeyboardShortcuts";
import useStores from "~/hooks/useStores";
import Sidebar from "../SidebarLayout";

/**
 * Renders the keyboard shortcuts reference inside the right sidebar panel
 * (rather than a center drawer), matching the AI and comments panels.
 */
function KeyboardShortcutsPanel() {
  const { t } = useTranslation();
  const { ui } = useStores();

  return (
    <Sidebar
      title={t("Keyboard shortcuts")}
      onClose={() => ui.set({ rightSidebar: null })}
    >
      <KeyboardShortcuts />
    </Sidebar>
  );
}

export default observer(KeyboardShortcutsPanel);
