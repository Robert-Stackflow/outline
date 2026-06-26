import Logger from "@server/logging/Logger";
import { PluginManager, Hook } from "@server/utils/PluginManager";
import config from "../plugin.json";
import { buildOIDCRouter } from "./auth/oidc";
import { getOIDCProviders } from "./providers";

const providers = getOIDCProviders();

if (providers.length > 0) {
  PluginManager.add(
    providers.map((provider) => ({
      ...config,
      type: Hook.AuthProvider,
      value: { router: buildOIDCRouter(provider), id: provider.id, icon: provider.icon },
      name: provider.name,
    }))
  );
  Logger.info(
    "plugins",
    `OIDC plugin registered with ${providers.length} provider(s): ${providers
      .map((p) => p.id)
      .join(", ")}`
  );
}
