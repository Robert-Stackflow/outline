import { subHours, subMinutes, addMonths } from "date-fns";
import Router from "koa-router";
import { uniqBy } from "es-toolkit/compat";
import { TeamPreference } from "@shared/types";
import { parseDomain, getCookieDomain } from "@shared/utils/domains";
import env from "@server/env";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { ValidationError } from "@server/errors";
import { Event, Team, User } from "@server/models";
import AuthenticationHelper from "@server/models/helpers/AuthenticationHelper";
import {
  presentUser,
  presentTeam,
  presentPolicies,
  presentProviderConfig,
  presentAvailableTeam,
  presentGroup,
  presentGroupUser,
} from "@server/presenters";
import ValidateSSOAccessTask from "@server/queues/tasks/ValidateSSOAccessTask";
import type { APIContext } from "@server/types";
import { getSessionsInCookie } from "@server/utils/authentication";
import RateLimiter from "@server/utils/RateLimiter";
import * as T from "./schema";

const router = new Router();

router.post("auth.config", async (ctx: APIContext<T.AuthConfigReq>) => {
  // If self hosted AND there is only one team then that team becomes the
  // brand for the knowledge base and it's guest signin option is used for the
  // root login page.
  if (!env.isCloudHosted) {
    const team = await Team.scope("withAuthenticationProviders").findOne({
      order: [["createdAt", "DESC"]],
    });

    if (team) {
      ctx.body = {
        data: {
          name: team.name,
          customTheme: team.getPreference(TeamPreference.CustomTheme),
          logo: team.getPreference(TeamPreference.PublicBranding)
            ? team.avatarUrl
            : undefined,
          providers: (await AuthenticationHelper.providersForTeam(team)).map(
            presentProviderConfig
          ),
        },
      };
      return;
    }
  }

  const domain = parseDomain(ctx.request.hostname);

  if (domain.custom) {
    const team = await Team.scope("withAuthenticationProviders").findOne({
      where: {
        domain: ctx.request.hostname.toLowerCase(),
      },
    });

    if (team) {
      ctx.body = {
        data: {
          name: team.name,
          customTheme: team.getPreference(TeamPreference.CustomTheme),
          logo: team.getPreference(TeamPreference.PublicBranding)
            ? team.avatarUrl
            : undefined,
          hostname: ctx.request.hostname,
          providers: (await AuthenticationHelper.providersForTeam(team)).map(
            presentProviderConfig
          ),
        },
      };
      return;
    }
  }

  // If subdomain signin page then we return minimal team details to allow
  // for a custom screen showing only relevant signin options for that team.
  else if (env.isCloudHosted && domain.teamSubdomain) {
    const team = await Team.scope("withAuthenticationProviders").findOne({
      where: {
        subdomain: domain.teamSubdomain,
      },
    });

    if (team) {
      ctx.body = {
        data: {
          name: team.name,
          customTheme: team.getPreference(TeamPreference.CustomTheme),
          logo: team.getPreference(TeamPreference.PublicBranding)
            ? team.avatarUrl
            : undefined,
          hostname: ctx.request.hostname,
          providers: (await AuthenticationHelper.providersForTeam(team)).map(
            presentProviderConfig
          ),
        },
      };
      return;
    }
  }

  // Otherwise, we're requesting from the standard root signin page
  ctx.body = {
    data: {
      providers: (await AuthenticationHelper.providersForTeam()).map(
        presentProviderConfig
      ),
    },
  };
});

/** Authentication services that don't require SSO validation. */
const NON_SSO_SERVICES = ["email", "passkeys"];

router.post("auth.info", auth(), async (ctx: APIContext<T.AuthInfoReq>) => {
  const { user, service } = ctx.state.auth;
  const sessions = getSessionsInCookie(ctx);
  const signedInTeamIds = Object.keys(sessions);

  const [team, groups, signedInTeams, availableTeams] = await Promise.all([
    Team.scope("withDomains").findByPk(user.teamId, {
      rejectOnEmpty: true,
    }),
    user.groups(),
    Team.findAll({
      where: {
        id: signedInTeamIds,
      },
    }),
    user.availableTeams(),
  ]);

  // If the user did not _just_ sign in then we need to check if they continue
  // to have access to the workspace they are signed into. This only applies
  // to SSO sessions - email and passkey logins don't have associated
  // UserAuthentication records that need validation.
  const isOAuthSession = !service || !NON_SSO_SERVICES.includes(service);
  if (
    isOAuthSession &&
    user.lastSignedInAt &&
    user.lastSignedInAt < subHours(new Date(), 1)
  ) {
    await new ValidateSSOAccessTask()
      .schedule(
        {
          userId: user.id,
        },
        {
          jobId: `validate-sso:${user.id}`,
        }
      )
      .catch(() => {
        // Ignore errors from duplicate jobId when a validation is already queued
      });
  }

  ctx.body = {
    data: {
      user: presentUser(user, {
        includeDetails: true,
      }),
      team: presentTeam(team),
      groups: await Promise.all(groups.map(presentGroup)),
      groupUsers: groups.map((group) => presentGroupUser(group.groupUsers[0])),
      collaborationToken: user.getCollaborationToken(),
      availableTeams: uniqBy([...signedInTeams, ...availableTeams], "id").map(
        (availableTeam) =>
          presentAvailableTeam(
            availableTeam,
            signedInTeamIds.includes(team.id) ||
              availableTeam.id === user.teamId
          )
      ),
    },
    policies: presentPolicies(user, [team, user, ...groups]),
  };
});

router.post(
  "auth.delete",
  auth(),
  transaction(),
  async (ctx: APIContext<T.AuthDeleteReq>) => {
    const { auth, transaction } = ctx.state;
    const { user, token } = auth;

    await user.rotateJwtSecret({ transaction });
    await Event.createFromContext(ctx, {
      name: "users.signout",
      userId: user.id,
      data: {
        name: user.name,
      },
    });

    void RateLimiter.clearCachedToken(token);

    ctx.cookies.set("accessToken", "", {
      sameSite: "lax",
      expires: subMinutes(new Date(), 1),
    });

    ctx.body = {
      success: true,
    };
  }
);

router.post(
  "auth.switch",
  auth(),
  validate(T.AuthSwitchSchema),
  transaction(),
  async (ctx: APIContext<T.AuthSwitchReq>) => {
    const { user } = ctx.state.auth;
    const { teamId } = ctx.input.body;

    // Locate the account that shares this email in the target workspace. This
    // mirrors the availableTeams logic (identity is keyed on email) and lets a
    // single browser session hop between every workspace the person belongs to
    // without a fresh SSO round-trip.
    const [targetUser, targetTeam] = await Promise.all([
      User.findOne({
        where: {
          teamId,
          email: user.email,
        },
      }),
      Team.findByPk(teamId),
    ]);

    if (!targetUser || !targetTeam || targetUser.isSuspended) {
      throw ValidationError("You do not have access to that workspace");
    }

    const expires = addMonths(new Date(), 3);
    const domain = getCookieDomain(ctx.request.hostname, env.isCloudHosted);

    // Record the workspace in the apex "sessions" cookie so the UI can list
    // every signed-in workspace, matching the cloud-hosted multi-session UX.
    const existing = getSessionsInCookie(ctx);
    const sessions = encodeURIComponent(
      JSON.stringify({
        ...existing,
        [targetTeam.id]: {
          name: targetTeam.name,
          logoUrl: targetTeam.avatarUrl,
          url: targetTeam.url,
        },
      })
    );
    ctx.cookies.set("sessions", sessions, {
      httpOnly: false,
      expires,
      domain,
    });

    // Swap the active access token to the target user's session.
    await targetUser.updateActiveAt(ctx, true);
    ctx.cookies.set("accessToken", targetUser.getSessionToken(expires), {
      sameSite: "lax",
      expires,
    });

    ctx.body = {
      success: true,
      data: {
        team: presentTeam(targetTeam),
      },
    };
  }
);

export default router;
