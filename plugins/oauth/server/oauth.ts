import OAuthClient from "@server/utils/oauth";
import type { OAuthProviderConfig } from "./providers";
import { getOAuthProviderById } from "./providers";

export class ConfiguredOAuthClient extends OAuthClient {
  protected endpoints: {
    authorize: string;
    token: string;
    userinfo: string;
  };

  constructor(provider: OAuthProviderConfig) {
    super(provider.clientId, provider.clientSecret);

    this.endpoints = {
      authorize: provider.authUri,
      token: provider.tokenUri,
      userinfo: provider.userInfoUri,
    };
  }
}

export function getOAuthClientForProvider(
  id: string
): ConfiguredOAuthClient | undefined {
  const provider = getOAuthProviderById(id);
  return provider ? new ConfiguredOAuthClient(provider) : undefined;
}
