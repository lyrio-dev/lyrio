import { AsyncLocalStorage } from "async_hooks";

import { NestMiddleware, Injectable } from "@nestjs/common";

import { Request, Response } from "express"; // eslint-disable-line import/no-extraneous-dependencies

import { UserEntity } from "@/user/user.entity";
import { UserPrivilegeService, UserPrivilegeType } from "@/user/user-privilege.service";

import { AuthSessionService } from "./auth-session.service";

const asyncLocalStorage = new AsyncLocalStorage();

export interface Session {
  sessionKey?: string;
  sessionId?: number;
  user?: UserEntity;
  userCanSkipRecaptcha: () => Promise<boolean>;
}

export interface RequestWithSession extends Request {
  session: Session;
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private readonly authSessionService: AuthSessionService,
    private readonly userPrivilegeService: UserPrivilegeService
  ) {}

  async use(req: RequestWithSession, res: Response, next: () => void): Promise<void> {
    const authHeader = req.headers.authorization;
    const sessionKey = authHeader && authHeader.split(" ")[1];
    if (sessionKey) {
      const [sessionId, user] = await this.authSessionService.accessSession(sessionKey);
      if (user) {
        req.session = {
          sessionKey,
          sessionId,
          user,
          userCanSkipRecaptcha: () => this.userPrivilegeService.userHasPrivilege(user, UserPrivilegeType.SkipRecaptcha)
        };
      }
    }

    asyncLocalStorage.run(req, () => next());
  }
}

/**
 * Get the current request object from async local storage.
 *
 * Calling it in a EventEmitter's callback may be not working since EventEmitter's callbacks
 * run in different contexts.
 */
export function getCurrentRequest(): RequestWithSession {
  return asyncLocalStorage.getStore() as RequestWithSession;
}
