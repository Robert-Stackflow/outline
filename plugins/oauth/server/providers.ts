import Logger from "@server/logging/Logger";
import env from "./env";

export type OAuthProfileType = "generic" | "github";

export interface OAuthProviderConfig {
  /** Unique id used for the passport strategy, routes and DB provider name. */
  id: string;
  /** Display name shown on the sign-in button. */
  name: string;
  clientId: string;
  clientSecret: string;
  authUri: string;
  tokenUri: string;
  userInfoUri: string;
  userInfoMethod: "GET" | "POST";
  scopes: string;
  profile: OAuthProfileType;
  /** Stable external provider id stored in authentication_providers. */
  providerId: string;
  idClaim: string;
  emailClaim: string;
  emailVerifiedClaim?: string;
  nameClaim: string;
  usernameClaim: string;
  avatarUrlClaim?: string;
  /** Brand icon key (e.g. "github", "gitlab") for the sign-in button. */
  icon?: string;
}

const DEFAULT_ID_CLAIM = "id";
const DEFAULT_EMAIL_CLAIM = "email";
const DEFAULT_EMAIL_VERIFIED_CLAIM = "email_verified";
const DEFAULT_NAME_CLAIM = "name";
const DEFAULT_USERNAME_CLAIM = "username";
const DEFAULT_AVATAR_URL_CLAIM = "avatar_url";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function getString(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const field = value[key];
  return typeof field === "string" && field ? field : undefined;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getHostname(url: string): string | undefined {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch (_err) {
    return undefined;
  }
}

function deriveProfile(
  explicit: string | undefined,
  authUri: string,
  userInfoUri: string
): OAuthProfileType {
  if (explicit === "github") {
    return "github";
  }

  const authHost = getHostname(authUri);
  const userInfoHost = getHostname(userInfoUri);
  if (authHost === "github.com" || userInfoHost === "api.github.com") {
    return "github";
  }

  return "generic";
}

function deriveIcon(
  explicit: string | undefined,
  authUri: string,
  userInfoUri: string
): string | undefined {
  if (explicit) {
    return explicit.toLowerCase();
  }

  const host = `${getHostname(authUri) ?? ""} ${getHostname(userInfoUri) ?? ""}`;
  const known: Array<[string, string]> = [
    ["github", "github"],
    ["gitlab", "gitlab"],
    ["google", "google"],
    ["microsoftonline", "microsoft"],
    ["microsoft", "microsoft"],
    ["bitbucket", "bitbucket"],
    ["slack", "slack"],
    ["discord", "discord"],
  ];

  return known.find(([needle]) => host.includes(needle))?.[1];
}

function normalizedId(
  entryId: string | undefined,
  name: string,
  index: number,
  usedIds: Set<string>
): string {
  const raw = entryId ? slug(entryId) : `oauth-${slug(name) || index}`;
  const base = raw.startsWith("oauth") ? raw : `oauth-${raw}`;
  let id = base;
  let suffix = 2;

  while (usedIds.has(id)) {
    id = `${base}-${suffix++}`;
  }

  usedIds.add(id);
  return id;
}

export function getOAuthProviders(): OAuthProviderConfig[] {
  if (!env.OAUTH_PROVIDERS) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(env.OAUTH_PROVIDERS);
  } catch (_err) {
    Logger.warn("OAUTH_PROVIDERS is not valid JSON, ignoring");
    return [];
  }

  if (!Array.isArray(parsed)) {
    Logger.warn("OAUTH_PROVIDERS must be a JSON array, ignoring");
    return [];
  }

  const usedIds = new Set<string>();
  const providers: OAuthProviderConfig[] = [];

  parsed.forEach((entry, index) => {
    const clientId = getString(entry, "clientId");
    const clientSecret = getString(entry, "clientSecret");
    const authUri = getString(entry, "authUri");
    const tokenUri = getString(entry, "tokenUri");
    const userInfoUri = getString(entry, "userInfoUri");
    const name = getString(entry, "name") ?? "OAuth";

    if (!clientId || !clientSecret || !authUri || !tokenUri || !userInfoUri) {
      Logger.warn(
        `OAUTH_PROVIDERS entry at index ${index} is missing required fields (clientId, clientSecret, authUri, tokenUri and userInfoUri), skipping`
      );
      return;
    }

    const profile = deriveProfile(
      getString(entry, "profile"),
      authUri,
      userInfoUri
    );
    const id = normalizedId(getString(entry, "id"), name, index, usedIds);
    const userInfoMethod =
      getString(entry, "userInfoMethod")?.toUpperCase() === "POST"
        ? "POST"
        : "GET";

    providers.push({
      id,
      name,
      clientId,
      clientSecret,
      authUri,
      tokenUri,
      userInfoUri,
      userInfoMethod,
      scopes:
        getString(entry, "scopes") ??
        (profile === "github" ? "read:user user:email" : ""),
      profile,
      providerId: getString(entry, "providerId") ?? id,
      idClaim: getString(entry, "idClaim") ?? DEFAULT_ID_CLAIM,
      emailClaim: getString(entry, "emailClaim") ?? DEFAULT_EMAIL_CLAIM,
      emailVerifiedClaim:
        getString(entry, "emailVerifiedClaim") ?? DEFAULT_EMAIL_VERIFIED_CLAIM,
      nameClaim: getString(entry, "nameClaim") ?? DEFAULT_NAME_CLAIM,
      usernameClaim:
        getString(entry, "usernameClaim") ??
        (profile === "github" ? "login" : DEFAULT_USERNAME_CLAIM),
      avatarUrlClaim:
        getString(entry, "avatarUrlClaim") ??
        (profile === "github" ? "avatar_url" : DEFAULT_AVATAR_URL_CLAIM),
      icon: deriveIcon(getString(entry, "icon"), authUri, userInfoUri),
    });
  });

  return providers;
}

export function getOAuthProviderById(
  id: string
): OAuthProviderConfig | undefined {
  return getOAuthProviders().find((provider) => provider.id === id);
}
