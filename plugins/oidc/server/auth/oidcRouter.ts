import passport from "@outlinewiki/koa-passport";
import { addMonths, subMinutes } from "date-fns";
import JWT from "jsonwebtoken";
import type { Context } from "koa";
import type Router from "koa-router";
import { get } from "es-toolkit/compat";
import { toError } from "@shared/utils/error";
import { getCookieDomain, slugifyDomain } from "@shared/utils/domains";
import { parseEmail } from "@shared/utils/email";
import { isBase64Url } from "@shared/utils/urls";
import accountProvisioner from "@server/commands/accountProvisioner";
import { OIDCMalformedUserInfoError } from "@server/errors";
import Logger from "@server/logging/Logger";
import passportMiddleware from "@server/middlewares/passport";
import type { User } from "@server/models";
import { AuthenticationProvider } from "@server/models";
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
import type { OIDCProviderConfig } from "../providers";
import { OIDCStrategy } from "./OIDCStrategy";
import { createContext } from "@server/context";

export interface OIDCEndpoints {
  authorizationURL: string;
  tokenURL: string;
  userInfoURL: string;
  logoutURL?: string;
  pkce?: boolean;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function getString(value: Record<string, unknown>, key: string) {
  const field = value[key];
  return typeof field === "string" && field ? field : undefined;
}

function getNullableString(value: Record<string, unknown>, key: string) {
  const field = value[key];
  return typeof field === "string" ? field : null;
}

function getStringOrNumber(value: Record<string, unknown>, key: string) {
  const field = value[key];
  return typeof field === "string" || typeof field === "number"
    ? field
    : undefined;
}

/**
 * Creates OIDC routes for a single provider and mounts them into the router.
 *
 * @param router the koa router to mount onto.
 * @param provider the resolved OIDC provider configuration.
 * @param endpoints the resolved OIDC endpoints for this provider.
 */
export function createOIDCRouter(
  router: Router,
  provider: OIDCProviderConfig,
  endpoints: OIDCEndpoints
): void {
  const scopes = provider.scopes.split(" ");
  const logoutPath = `/auth/${provider.id}.logout`;
  const idTokenCookie = `${provider.id}IdToken`;

  passport.use(
    provider.id,
    new OIDCStrategy(
      {
        authorizationURL: endpoints.authorizationURL,
        tokenURL: endpoints.tokenURL,
        clientID: provider.clientId,
        clientSecret: provider.clientSecret,
        callbackURL: `${env.URL}/auth/${provider.id}.callback`,
        passReqToCallback: true,
        scope: provider.scopes,
        // @ts-expect-error custom state store
        store: new StateStore(endpoints.pkce),
        state: true,
        pkce: endpoints.pkce ?? false,
      },
      // OpenID Connect standard profile claims can be found in the official
      // specification.
      // https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims
      // Non-standard claims may be configured by individual identity providers.
      // Any claim supplied in response to the userinfo request will be
      // available on the `profile` parameter
      async function (
        context: Context,
        accessToken: string,
        refreshToken: string,
        params: { expires_in: number; id_token: string; scope?: string },
        _profile: unknown,
        done: (
          err: Error | null,
          user: User | null,
          result?: AuthenticationResult
        ) => void
      ) {
        try {
          // Some providers require a POST request to the userinfo endpoint, add them as exceptions here.
          const usePostMethod = [
            "https://api.dropboxapi.com/2/openid/userinfo",
          ];

          const profileResponse = await request(
            usePostMethod.includes(endpoints.userInfoURL) ? "POST" : "GET",
            endpoints.userInfoURL,
            accessToken
          );

          if (!isObject(profileResponse)) {
            throw OIDCMalformedUserInfoError();
          }
          const profile = profileResponse;

          // Some providers, namely ADFS, don't provide anything more than the `sub` claim in the userinfo endpoint
          // So, we'll decode the params.id_token and see if that contains what we need.
          const token = (() => {
            try {
              const decoded = JWT.decode(params.id_token);

              if (!decoded || typeof decoded !== "object") {
                Logger.warn("Decoded id_token is not a valid object");
                return {};
              }

              return decoded as Record<string, unknown>;
            } catch (err) {
              Logger.error("id_token decode threw error: ", toError(err));
              return {};
            }
          })();

          const email =
            getString(profile, "email") ?? getString(token, "email") ?? null;

          if (!email) {
            throw OIDCMalformedUserInfoError();
          }

          // The email_verified claim is part of the OIDC standard claims.
          // https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims
          const emailVerifiedClaim =
            profile.email_verified ?? token.email_verified;
          const emailVerified =
            emailVerifiedClaim === undefined
              ? undefined
              : emailVerifiedClaim === true || emailVerifiedClaim === "true";

          const team = await getTeamFromContext(context);
          const client = getClientFromOAuthState(context);
          const user =
            context.state?.auth?.user ?? (await getUserFromOAuthState(context));
          const { domain } = parseEmail(email);

          // Find the existing authentication provider for this OIDC provider.
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

          // Derive a providerId from the OIDC location if there is no existing provider.
          const oidcURL = new URL(endpoints.authorizationURL);
          const providerId =
            authenticationProvider?.providerId ?? oidcURL.hostname;

          if (!domain) {
            throw OIDCMalformedUserInfoError();
          }

          // remove the TLD and form a subdomain from the remaining
          const subdomain = slugifyDomain(domain);

          // Claim name can be overriden using an env variable.
          // Default is 'preferred_username' as per OIDC spec.
          // This will default to the profile.preferred_username, but will fall back to preferred_username from the id_token
          const usernameClaim =
            get(profile, provider.usernameClaim) ??
            get(token, provider.usernameClaim);
          const username =
            typeof usernameClaim === "string" && usernameClaim
              ? usernameClaim
              : undefined;
          const name =
            getString(profile, "name") ??
            username ??
            getString(profile, "username") ??
            getString(profile, "login");
          const profileId =
            getStringOrNumber(profile, "sub") ??
            getStringOrNumber(token, "sub") ??
            getStringOrNumber(profile, "id");

          if (!name) {
            throw OIDCMalformedUserInfoError();
          }
          if (!profileId) {
            throw OIDCMalformedUserInfoError();
          }

          // Check if the picture field is a Base64 data URL and filter it out
          // to avoid validation errors in the User model
          let avatarUrl =
            getNullableString(profile, "picture") ??
            getNullableString(profile, "avatar_url");
          if (avatarUrl && isBase64Url(avatarUrl)) {
            Logger.debug(
              "authentication",
              "Filtering out Base64 data URL from avatar",
              {
                email,
              }
            );
            avatarUrl = null;
          }

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
              subdomain,
            },
            user: {
              name,
              email,
              emailVerified,
              avatarUrl,
            },
            authenticationProvider: {
              name: provider.id,
              providerId,
            },
            authentication: {
              providerId: String(profileId),
              accessToken,
              refreshToken,
              expiresIn: params.expires_in,
              scopes: params.scope ? params.scope.split(" ") : scopes,
            },
          });
          // Persist the id_token so a later RP-initiated logout can pass it as
          // the `id_token_hint`, allowing the provider to scope the logout to
          // this session rather than terminating its global SSO session.
          if (endpoints.logoutURL && params.id_token) {
            context.cookies.set(idTokenCookie, params.id_token, {
              httpOnly: true,
              sameSite: "lax",
              secure: env.isProduction,
              path: logoutPath,
              domain: getCookieDomain(
                context.request.hostname,
                env.isCloudHosted
              ),
              expires: addMonths(new Date(), 3),
            });
          }

          return done(null, result.user, { ...result, client });
        } catch (err) {
          return done(toError(err), null);
        }
      }
    )
  );

  router.get(provider.id, startOAuthFlow, passport.authenticate(provider.id));
  router.get(`${provider.id}.callback`, passportMiddleware(provider.id));
  router.post(`${provider.id}.callback`, passportMiddleware(provider.id));

  // Performs a spec-compliant RP-initiated logout against the provider's end
  // session endpoint. Passing `id_token_hint` identifies the session being
  // ended so the provider can scope the logout and skip a confirmation prompt,
  // while `post_logout_redirect_uri` returns the user to Outline afterwards.
  // https://openid.net/specs/openid-connect-rpinitiated-1_0.html
  router.get(`${provider.id}.logout`, (ctx: Context) => {
    const idToken = ctx.cookies.get(idTokenCookie);

    // Always discard our copy of the id_token, regardless of where we redirect.
    ctx.cookies.set(idTokenCookie, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: env.isProduction,
      path: logoutPath,
      domain: getCookieDomain(ctx.request.hostname, env.isCloudHosted),
      expires: subMinutes(new Date(), 1),
    });

    if (!endpoints.logoutURL) {
      return ctx.redirect("/");
    }

    try {
      const url = new URL(endpoints.logoutURL);
      if (idToken) {
        url.searchParams.set("id_token_hint", idToken);
      }
      if (provider.clientId) {
        url.searchParams.set("client_id", provider.clientId);
      }
      url.searchParams.set("post_logout_redirect_uri", env.URL);

      return ctx.redirect(url.toString());
    } catch (err) {
      Logger.warn("Invalid OIDC logout URL", {
        error: toError(err).message,
      });
      return ctx.redirect("/");
    }
  });
}
