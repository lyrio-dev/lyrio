import { NestMiddleware, Injectable } from "@nestjs/common";
import { Request, Response } from "express";

import { AuthSessionService } from "./auth-session.service";
import { UserEntity } from "@/user/user.entity";

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

  async use(req: RequestWithSession, res: Response, next: Function) {
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
    next();
  }
}
