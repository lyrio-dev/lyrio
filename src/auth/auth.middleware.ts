import { NestMiddleware, Injectable } from "@nestjs/common";
import { Request, Response } from "express";
import { AsyncLocalStorage } from "async_hooks";

import { AuthSessionService } from "./auth-session.service";
import { UserEntity } from "@/user/user.entity";

const asyncLocalStorage = new AsyncLocalStorage();

export interface Session {
  sessionKey?: string;
  sessionId?: number;
  user?: UserEntity;
}

export interface RequestWithSession extends Request {
  session: Session;
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly authSessionService: AuthSessionService) {}

  async use(req: RequestWithSession, res: Response, next: () => void) {
    const authHeader = req.headers.authorization,
      sessionKey = authHeader && authHeader.split(" ")[1];
    if (sessionKey) {
      const [sessionId, user] = await this.authSessionService.accessSession(sessionKey);
      if (user) {
        req.session = {
          sessionKey: sessionKey,
          sessionId: sessionId,
          user: user
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
export const getCurrentRequest = () => asyncLocalStorage.getStore() as RequestWithSession;
