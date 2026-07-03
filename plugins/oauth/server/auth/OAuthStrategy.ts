import type { Request } from "express";
import type OAuth2Strategy from "passport-oauth2";
import { Strategy } from "passport-oauth2";

interface AuthenticateOptions {
  originalQuery?: Request["query"];
  [key: string]: unknown;
}

export class OAuthStrategy extends Strategy {
  constructor(
    options: OAuth2Strategy.StrategyOptionsWithRequest,
    verify: OAuth2Strategy.VerifyFunctionWithRequest
  ) {
    super(options, verify);
  }

  authenticate(req: Request, options: AuthenticateOptions) {
    options.originalQuery = req.query;
    super.authenticate(req, options);
  }

  authorizationParams(options: AuthenticateOptions) {
    return {
      ...options.originalQuery,
      ...super.authorizationParams?.(options),
    };
  }
}
