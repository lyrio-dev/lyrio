import { NestMiddleware, Injectable } from "@nestjs/common";
import * as jwt from "jsonwebtoken";

import { UserService } from "@/user/user.service";
import { ConfigService } from "@/config/config.service";

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly userService: UserService, private readonly configService: ConfigService) {}

  async use(req: any, res: any, next: Function) {
    const authHeaders: string = req.headers.authorization,
      token: string = authHeaders && authHeaders.split(" ")[1];
    if (token) {
      try {
        const decoded: string = jwt.verify(token, this.configService.config.security.sessionSecret) as string;
        req.user = this.userService.findUserById(parseInt(decoded));
      } catch (e) {}
    }
    next();
  }
}
