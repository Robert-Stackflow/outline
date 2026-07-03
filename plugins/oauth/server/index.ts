import Logger from "@server/logging/Logger";
import { PluginManager, Hook } from "@server/utils/PluginManager";
import config from "../plugin.json";
import { buildOAuthRouter } from "./auth/oauth";
import { getOAuthProviders } from "./providers";

const providers = getOAuthProviders();

if (providers.length > 0) {
  PluginManager.add(
    providers.map((provider) => ({
      ...config,
      type: Hook.AuthProvider,
      value: {
        router: buildOAuthRouter(provider),
        id: provider.id,
        icon: provider.icon,
      },
      name: provider.name,
    }))
  );
  Logger.info(
    "plugins",
    `OAuth plugin registered with ${providers.length} provider(s): ${providers
      .map((provider) => provider.id)
      .join(", ")}`
  );
}
