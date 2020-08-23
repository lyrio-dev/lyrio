import { NestMiddleware, Injectable } from "@nestjs/common";
import { Request, Response } from "express";

import { AuthSessionService } from "./auth-session.service";

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly authSessionService: AuthSessionService) {}

  async use(req: Request, res: Response, next: Function) {
    const authHeader = req.headers.authorization,
      sessionKey = authHeader && authHeader.split(" ")[1];
    if (sessionKey) {
      req["sessionKey"] = sessionKey;
      req["user"] = await this.authSessionService.accessSession(sessionKey);
    }
    next();
  }
}
