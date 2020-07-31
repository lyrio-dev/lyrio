import { NestMiddleware, Injectable } from "@nestjs/common";

import { AuthSessionService } from "./auth-session.service";

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly authSessionService: AuthSessionService) {}

  async use(req: any, res: any, next: Function) {
    const authHeaders: string = req.headers.authorization,
      token: string = authHeaders && authHeaders.split(" ")[1];
    if (token) {
      req.user = await this.authSessionService.getSessionUser(token);
    }
    next();
  }
}
