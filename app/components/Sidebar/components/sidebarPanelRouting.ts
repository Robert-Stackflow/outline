import type { AiConfig } from "~/stores/AiStore";
import type { SidebarPanel } from "./SidebarPanelContext";

interface RouteChangeOptions {
  panel: SidebarPanel;
  previousPathname: string;
  pathname: string;
  aiPathname: string;
  showAiEntry: boolean;
  aiRouteHandled: boolean;
}

interface ScrollAreaOptions {
  panel: SidebarPanel;
  scrollArea: HTMLElement | null;
}

/**
 * Returns whether the AI entry should be visible in primary navigation.
 *
 * @param config the workspace AI configuration, if it has been loaded.
 * @returns true when AI is fully configured for the workspace.
 */
export function shouldShowAiEntry(
  config: Pick<AiConfig, "configured"> | undefined
): boolean {
  return config?.configured === true;
}

/**
 * Resolves the sidebar panel after route or AI availability changes.
 *
 * @param options current route and panel state.
 * @returns the panel that should remain active.
 */
export function getSidebarPanelAfterRouteChange({
  panel,
  previousPathname,
  pathname,
  aiPathname,
  showAiEntry,
  aiRouteHandled,
}: RouteChangeOptions): SidebarPanel {
  if (!showAiEntry) {
    return panel === "ai" ? "home" : panel;
  }

  if (pathname === aiPathname && !aiRouteHandled) {
    return "ai";
  }

  if (
    panel === "ai" &&
    previousPathname === aiPathname &&
    pathname !== aiPathname
  ) {
    return "home";
  }

  return panel;
}

/**
 * Resolves the scroll area exposed to virtualized sidebar rows.
 *
 * @param options current panel and attached scroll node.
 * @returns the home scroll area, or null for panels without collection rows.
 */
export function getSidebarScrollAreaForPanel({
  panel,
  scrollArea,
}: ScrollAreaOptions): HTMLElement | null {
  return panel === "home" ? scrollArea : null;
}
