import { observer } from "mobx-react";
import styled from "styled-components";
import Logger from "~/utils/Logger";
import { Hook, PluginManager, usePluginValue } from "~/utils/PluginManager";

type Props = {
  /** The ID of the plugin to render an Icon for. */
  id: string;
  /** The size of the icon. */
  size?: number;
  /** The color of the icon. */
  color?: string;
};

/**
 * Renders an icon defined in a plugin (Hook.Icon).
 */
function PluginIcon({ id, color, size = 24 }: Props) {
  const exact = usePluginValue(Hook.Icon, id);
  // Fall back to the base plugin icon for namespaced provider ids, e.g. a
  // dynamically configured "oidc-google" provider uses the shared "oidc" icon.
  const base = usePluginValue(Hook.Icon, id.split("-")[0]);
  const Icon = exact ?? base;

  if (Icon) {
    return (
      <IconPosition>
        <Icon size={size} fill={color} />
      </IconPosition>
    );
  }

  if (PluginManager.isLoaded) {
    Logger.warn("No Icon registered for plugin", { id });
  }
  return null;
}

const IconPosition = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
`;

export default observer(PluginIcon);
