import * as React from "react";

export type SidebarPanel = "home" | "notifications" | "ai";

type Ctx = {
  panel: SidebarPanel;
  setPanel: (next: SidebarPanel) => void;
};

const SidebarPanelContext = React.createContext<Ctx>({
  panel: "home",
  setPanel: () => {},
});

export function SidebarPanelProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [panel, setPanel] = React.useState<SidebarPanel>("home");
  const value = React.useMemo(() => ({ panel, setPanel }), [panel]);
  return (
    <SidebarPanelContext.Provider value={value}>
      {children}
    </SidebarPanelContext.Provider>
  );
}

export function useSidebarPanel() {
  return React.useContext(SidebarPanelContext);
}
