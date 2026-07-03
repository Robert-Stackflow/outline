import { IsOptional } from "class-validator";
import { Environment } from "@server/env";
import environment from "@server/utils/environment";

class OAuthPluginEnvironment extends Environment {
  /**
   * A JSON array of OAuth2 providers to enable simultaneously. Each entry
   * supports: id, name, clientId, clientSecret, authUri, tokenUri, userInfoUri,
   * scopes, profile, icon, providerId, and claim mappings.
   */
  @IsOptional()
  public OAUTH_PROVIDERS = this.toOptionalString(environment.OAUTH_PROVIDERS);
}

export default new OAuthPluginEnvironment();
