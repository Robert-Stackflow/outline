import passport from "@outlinewiki/koa-passport";
import type { Context } from "koa";
import Router from "koa-router";
import { toError } from "@shared/utils/error";
import { slugifyDomain } from "@shared/utils/domains";
import { parseEmail } from "@shared/utils/email";
import { isBase64Url } from "@shared/utils/urls";
import accountProvisioner from "@server/commands/accountProvisioner";
import { createContext } from "@server/context";
import { OIDCMalformedUserInfoError as MalformedUserInfoError } from "@server/errors";
import passportMiddleware from "@server/middlewares/passport";
import { AuthenticationProvider } from "@server/models";
import type { User } from "@server/models";
import type { AuthenticationResult } from "@server/types";
import {
  StateStore,
  getTeamFromContext,
  getClientFromOAuthState,
  getUserFromOAuthState,
  request,
  startOAuthFlow,
} from "@server/utils/passport";
import env from "../env";
import type { OAuthProviderConfig } from "../providers";
import { OAuthStrategy } from "./OAuthStrategy";

interface OAuthParams {
  expires_in?: number | string;
  scope?: string;
}

interface NormalizedOAuthProfile {
  email: string;
  emailVerified?: boolean;
  name: string;
  providerUserId: string | number;
  avatarUrl?: string | null;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

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

function getNullableString(value: unknown, key: string): string | null {
  if (!isRecord(value)) {
    return null;
  }
  const field = value[key];
  return typeof field === "string" ? field : null;
}

function getStringOrNumber(
  value: unknown,
  key: string
): string | number | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const field = value[key];
  return typeof field === "string" || typeof field === "number"
    ? field
    : undefined;
}

function getPathValue(value: unknown, path: string): unknown {
  if (!path) {
    return undefined;
  }

  let current = value;
  for (const segment of path.split(".")) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[segment];
  }

  return current;
}

function getPathString(value: unknown, path: string): string | undefined {
  const field = getPathValue(value, path);
  return typeof field === "string" && field ? field : undefined;
}

function getPathNullableString(value: unknown, path?: string): string | null {
  if (!path) {
    return null;
  }
  const field = getPathValue(value, path);
  return typeof field === "string" ? field : null;
}

function getPathStringOrNumber(
  value: unknown,
  path: string
): string | number | undefined {
  const field = getPathValue(value, path);
  return typeof field === "string" || typeof field === "number"
    ? field
    : undefined;
}

function getBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    if (value === "true") {
      return true;
    }
    if (value === "false") {
      return false;
    }
  }
  return undefined;
}

function isGitHubEmail(value: unknown): value is GitHubEmail {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.email === "string" &&
    typeof value.primary === "boolean" &&
    typeof value.verified === "boolean"
  );
}

async function getGitHubPrimaryEmail(accessToken: string) {
  const response = await request(
    "GET",
    "https://api.github.com/user/emails",
    accessToken
  );

  if (!Array.isArray(response)) {
    return undefined;
  }

  const emails = response.filter(isGitHubEmail);
  return (
    emails.find((email) => email.primary && email.verified) ??
    emails.find((email) => email.verified) ??
    emails.find((email) => email.primary) ??
    emails[0]
  );
}

async function normalizeGitHubProfile(
  profile: unknown,
  accessToken: string
): Promise<NormalizedOAuthProfile> {
  const email = await getGitHubPrimaryEmail(accessToken);
  const fallbackEmail = getString(profile, "email");
  const profileEmail = email?.email ?? fallbackEmail;
  const providerUserId = getStringOrNumber(profile, "id");
  const name =
    getString(profile, "name") ?? getString(profile, "login") ?? profileEmail;

  if (!providerUserId || !name || !profileEmail) {
    throw MalformedUserInfoError();
  }

  return {
    email: profileEmail,
    emailVerified: email?.verified,
    name,
    providerUserId,
    avatarUrl: getNullableString(profile, "avatar_url"),
  };
}

function normalizeGenericProfile(
  provider: OAuthProviderConfig,
  profile: unknown
): NormalizedOAuthProfile {
  const email = getPathString(profile, provider.emailClaim);
  const providerUserId = getPathStringOrNumber(profile, provider.idClaim);
  const name =
    getPathString(profile, provider.nameClaim) ??
    getPathString(profile, provider.usernameClaim) ??
    email;

  if (!email || !providerUserId || !name) {
    throw MalformedUserInfoError();
  }

  return {
    email,
    emailVerified: provider.emailVerifiedClaim
      ? getBoolean(getPathValue(profile, provider.emailVerifiedClaim))
      : undefined,
    name,
    providerUserId,
    avatarUrl: getPathNullableString(profile, provider.avatarUrlClaim),
  };
}

async function normalizeOAuthProfile(
  provider: OAuthProviderConfig,
  profile: unknown,
  accessToken: string
) {
  return provider.profile === "github"
    ? normalizeGitHubProfile(profile, accessToken)
    : normalizeGenericProfile(provider, profile);
}

function normalizeExpiresIn(value: number | string | undefined) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

/**
 * Builds a koa router exposing auth routes for a configured OAuth2 provider.
 *
 * @param provider the OAuth2 provider configuration.
 * @returns the configured router.
 */
export function buildOAuthRouter(provider: OAuthProviderConfig): Router {
  const router = new Router();
  const scopes = provider.scopes.split(" ").filter(Boolean);

  passport.use(
    provider.id,
    new OAuthStrategy(
      {
        authorizationURL: provider.authUri,
        tokenURL: provider.tokenUri,
        clientID: provider.clientId,
        clientSecret: provider.clientSecret,
        callbackURL: `${env.URL}/auth/${provider.id}.callback`,
        passReqToCallback: true,
        scope: scopes,
        // @ts-expect-error custom state store
        store: new StateStore(),
        state: true,
        pkce: false,
      },
      async function (
        context: Context,
        accessToken: string,
        refreshToken: string,
        params: OAuthParams,
        _profile: unknown,
        done: (
          err: Error | null,
          user: User | null,
          result?: AuthenticationResult
        ) => void
      ) {
        try {
          const profile = await request(
            provider.userInfoMethod,
            provider.userInfoUri,
            accessToken
          );
          const normalized = await normalizeOAuthProfile(
            provider,
            profile,
            accessToken
          );
          const team = await getTeamFromContext(context);
          const client = getClientFromOAuthState(context);
          const user =
            context.state?.auth?.user ?? (await getUserFromOAuthState(context));
          const { domain } = parseEmail(normalized.email);

          if (!domain) {
            throw MalformedUserInfoError();
          }

          const authenticationProvider = team
            ? ((await AuthenticationProvider.findOne({
                where: {
                  name: provider.id,
                  teamId: team.id,
                  providerId: domain,
                },
              })) ??
              (await AuthenticationProvider.findOne({
                where: {
                  name: provider.id,
                  teamId: team.id,
                },
              })))
            : undefined;
          const providerId =
            authenticationProvider?.providerId ?? provider.providerId;
          const avatarUrl =
            normalized.avatarUrl && isBase64Url(normalized.avatarUrl)
              ? null
              : normalized.avatarUrl;
          const ctx = createContext({
            ip: context.ip,
            user,
            authType: context.state?.auth?.type,
          });
          const result = await accountProvisioner(ctx, {
            team: {
              teamId: team?.id,
              name: env.APP_NAME,
              domain,
              subdomain: slugifyDomain(domain),
            },
            user: {
              name: normalized.name,
              email: normalized.email,
              emailVerified: normalized.emailVerified,
              avatarUrl,
            },
            authenticationProvider: {
              name: provider.id,
              providerId,
            },
            authentication: {
              providerId: String(normalized.providerUserId),
              accessToken,
              refreshToken,
              expiresIn: normalizeExpiresIn(params.expires_in),
              scopes: params.scope ? params.scope.split(" ") : scopes,
            },
          });

          return done(null, result.user, { ...result, client });
        } catch (err) {
          return done(toError(err), null);
        }
      }
    )
  );

  router.get(
    provider.id,
    startOAuthFlow,
    passport.authenticate(provider.id, {
      scope: scopes,
    })
  );
  router.get(`${provider.id}.callback`, passportMiddleware(provider.id));

  return router;
}
