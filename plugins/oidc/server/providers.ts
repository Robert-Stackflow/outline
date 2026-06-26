import Logger from "@server/logging/Logger";
import env from "./env";

/**
 * Resolved configuration for a single OIDC provider. Multiple providers can be
 * configured simultaneously — the legacy single-provider `OIDC_*` variables form
 * one provider, and additional providers are supplied via the `OIDC_PROVIDERS`
 * JSON array.
 */
export interface OIDCProviderConfig {
  /** Unique id used for the passport strategy, routes and DB provider name. */
  id: string;
  /** Display name shown on the sign-in button. */
  name: string;
  clientId: string;
  clientSecret: string;
  /** Issuer URL for automatic endpoint discovery. */
  issuerUrl?: string;
  /** Manual endpoints (used when issuerUrl is not provided). */
  authUri?: string;
  tokenUri?: string;
  userInfoUri?: string;
  logoutUri?: string;
  /** Space separated OIDC scopes. */
  scopes: string;
  /** Profile claim to use as the username. */
  usernameClaim: string;
  /** Disable auto-redirect when this is the only provider. */
  disableRedirect?: boolean;
  /** Brand icon key (e.g. "github", "gitlab") for the sign-in button. */
  icon?: string;
}

const DEFAULT_SCOPES = "openid profile email";
const DEFAULT_USERNAME_CLAIM = "preferred_username";

/**
 * Convert an arbitrary string into a url/route-safe slug.
 *
 * @param value the string to slugify.
 * @returns a lowercased, dash-separated slug.
 */
function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Determine a brand icon key for a provider from an explicit value or by
 * sniffing the issuer/authorization hostname.
 *
 * @param explicit an explicitly configured icon key.
 * @param url an issuer or authorization URL to sniff.
 * @returns a known brand key, or undefined to fall back to the generic icon.
 */
function deriveIcon(
  explicit: string | undefined,
  url: string | undefined
): string | undefined {
  if (explicit) {
    return explicit.toLowerCase();
  }
  if (!url) {
    return undefined;
  }
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return undefined;
  }
  const known: Array<[string, string]> = [
    ["github", "github"],
    ["gitlab", "gitlab"],
    ["google", "google"],
    ["microsoftonline", "microsoft"],
    ["microsoft", "microsoft"],
    ["bitbucket", "bitbucket"],
    ["slack", "slack"],
    ["okta", "okta"],
    ["auth0", "auth0"],
    ["discord", "discord"],
  ];
  return known.find(([needle]) => host.includes(needle))?.[1];
}

/**
 * Returns true when the legacy single-provider OIDC variables are sufficiently
 * configured to enable a provider.
 */
function hasLegacyConfig(): boolean {
  const hasManual = !!(
    env.OIDC_CLIENT_ID &&
    env.OIDC_CLIENT_SECRET &&
    env.OIDC_AUTH_URI &&
    env.OIDC_TOKEN_URI &&
    env.OIDC_USERINFO_URI
  );
  const hasIssuer = !!(
    env.OIDC_CLIENT_ID &&
    env.OIDC_CLIENT_SECRET &&
    env.OIDC_ISSUER_URL
  );
  return hasManual || hasIssuer;
}

/**
 * Parse the OIDC_PROVIDERS JSON array into validated provider configs.
 *
 * @param usedIds set of provider ids already taken, mutated to ensure uniqueness.
 * @returns the list of additional providers.
 */
function parseJsonProviders(usedIds: Set<string>): OIDCProviderConfig[] {
  if (!env.OIDC_PROVIDERS) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(env.OIDC_PROVIDERS);
  } catch (_err) {
    Logger.warn("OIDC_PROVIDERS is not valid JSON, ignoring");
    return [];
  }

  if (!Array.isArray(parsed)) {
    Logger.warn("OIDC_PROVIDERS must be a JSON array, ignoring");
    return [];
  }

  const providers: OIDCProviderConfig[] = [];

  parsed.forEach((entry, index) => {
    const raw = entry as Record<string, unknown>;
    const clientId = raw.clientId as string;
    const clientSecret = raw.clientSecret as string;
    const issuerUrl = raw.issuerUrl as string | undefined;
    const authUri = raw.authUri as string | undefined;
    const tokenUri = raw.tokenUri as string | undefined;
    const userInfoUri = raw.userInfoUri as string | undefined;
    const name = (raw.name as string) || "OpenID Connect";

    const hasManual = !!(authUri && tokenUri && userInfoUri);
    if (!clientId || !clientSecret || !(issuerUrl || hasManual)) {
      Logger.warn(
        `OIDC_PROVIDERS entry at index ${index} is missing required fields (clientId, clientSecret and issuerUrl or manual endpoints), skipping`
      );
      return;
    }

    // Derive a stable, unique, route-safe id. An explicit `id` is honored as-is
    // (so an existing provider can keep its DB name, e.g. "oidc"); otherwise one
    // is generated from the name. All ids are normalized to start with "oidc" so
    // the client can fall back to the shared OIDC icon.
    let base: string;
    if (raw.id) {
      const s = slug(String(raw.id));
      base = s.startsWith("oidc") ? s : `oidc-${s}`;
    } else {
      base = `oidc-${slug(name) || index}`;
    }
    let id = base;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${base}-${suffix++}`;
    }
    usedIds.add(id);

    providers.push({
      id,
      name,
      clientId,
      clientSecret,
      issuerUrl,
      authUri,
      tokenUri,
      userInfoUri,
      logoutUri: raw.logoutUri as string | undefined,
      scopes: (raw.scopes as string) || DEFAULT_SCOPES,
      usernameClaim: (raw.usernameClaim as string) || DEFAULT_USERNAME_CLAIM,
      disableRedirect: raw.disableRedirect as boolean | undefined,
      icon: deriveIcon(raw.icon as string | undefined, issuerUrl || authUri),
    });
  });

  return providers;
}

/**
 * Returns all configured OIDC providers, combining the legacy single-provider
 * `OIDC_*` variables (kept as the "oidc" provider for backwards compatibility)
 * with any providers declared in the `OIDC_PROVIDERS` JSON array.
 *
 * @returns the list of enabled OIDC providers.
 */
export function getOIDCProviders(): OIDCProviderConfig[] {
  const usedIds = new Set<string>();
  const providers: OIDCProviderConfig[] = [];

  if (hasLegacyConfig()) {
    usedIds.add("oidc");
    providers.push({
      id: "oidc",
      name: env.OIDC_DISPLAY_NAME,
      clientId: env.OIDC_CLIENT_ID!,
      clientSecret: env.OIDC_CLIENT_SECRET!,
      issuerUrl: env.OIDC_ISSUER_URL,
      authUri: env.OIDC_AUTH_URI,
      tokenUri: env.OIDC_TOKEN_URI,
      userInfoUri: env.OIDC_USERINFO_URI,
      logoutUri: env.OIDC_LOGOUT_URI,
      scopes: env.OIDC_SCOPES,
      usernameClaim: env.OIDC_USERNAME_CLAIM,
      disableRedirect: env.OIDC_DISABLE_REDIRECT ?? undefined,
      icon: deriveIcon(undefined, env.OIDC_ISSUER_URL || env.OIDC_AUTH_URI),
    });
  }

  providers.push(...parseJsonProviders(usedIds));

  return providers;
}
