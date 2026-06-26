import Router from "koa-router";
import { toError } from "@shared/utils/error";
import Logger from "@server/logging/Logger";
import { fetchOIDCConfiguration } from "../oidcDiscovery";
import type { OIDCProviderConfig } from "../providers";
import { createOIDCRouter } from "./oidcRouter";

/**
 * Builds a koa router exposing the auth routes for a single OIDC provider.
 *
 * When manual endpoints are configured they are mounted immediately, otherwise
 * the issuer's well-known configuration is discovered asynchronously and the
 * endpoints mounted once available.
 *
 * @param provider the resolved OIDC provider configuration.
 * @returns a promise resolving to the provider's router.
 */
export function buildOIDCRouter(provider: OIDCProviderConfig): Promise<Router> {
  const router = new Router();

  const hasManualConfig = !!(
    provider.authUri &&
    provider.tokenUri &&
    provider.userInfoUri
  );

  if (hasManualConfig) {
    createOIDCRouter(router, provider, {
      authorizationURL: provider.authUri!,
      tokenURL: provider.tokenUri!,
      userInfoURL: provider.userInfoUri!,
      logoutURL: provider.logoutUri,
    });
    Logger.info("plugins", "OIDC endpoints mounted with manual configuration", {
      id: provider.id,
    });
    return Promise.resolve(router);
  }

  if (provider.issuerUrl) {
    return (async () => {
      try {
        Logger.debug("plugins", "Starting OIDC configuration discovery", {
          id: provider.id,
        });

        const oidcConfig = await fetchOIDCConfiguration(provider.issuerUrl!);

        createOIDCRouter(router, provider, {
          authorizationURL: oidcConfig.authorization_endpoint,
          tokenURL: oidcConfig.token_endpoint,
          userInfoURL: oidcConfig.userinfo_endpoint,
          logoutURL: oidcConfig.end_session_endpoint ?? provider.logoutUri,
          pkce: oidcConfig.code_challenge_methods_supported?.includes("S256"),
        });

        Logger.info("plugins", "OIDC endpoints mounted after discovery", {
          id: provider.id,
          issuer: oidcConfig.issuer,
        });

        return router;
      } catch (error) {
        Logger.fatal("Failed to discover OIDC configuration", toError(error));
        throw error;
      }
    })();
  }

  return Promise.resolve(router);
}
