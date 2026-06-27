import { observer } from "mobx-react";
import * as React from "react";
import { useLocation } from "react-router-dom";
import KeyboardShortcutsPanel from "~/scenes/Document/components/Shortcuts/KeyboardShortcutsPanel";
import { useSetRightSidebar } from "~/components/RightSidebarContext";
import useStores from "~/hooks/useStores";

/**
 * Manages app-wide right sidebar panels that are not tied to a document scene
 * (currently just keyboard shortcuts). On document routes the document scene's
 * own `useDocumentSidebar` owns the slot, so this stays out of the way there.
 */
function GlobalRightSidebar() {
  const { ui } = useStores();
  const location = useLocation();
  const setSidebar = useSetRightSidebar();
  const isDocument = location.pathname.startsWith("/doc/");

  React.useEffect(() => {
    if (isDocument) {
      return;
    }
    if (ui.rightSidebar === "shortcuts") {
      setSidebar(<KeyboardShortcutsPanel />);
    } else {
      setSidebar(null);
    }
  }, [isDocument, ui.rightSidebar, setSidebar]);

  return null;
}

export default observer(GlobalRightSidebar);
