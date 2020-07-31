import { Injectable } from "@nestjs/common";
import * as jwt from "jsonwebtoken";

import { UserEntity } from "@/user/user.entity";
import { ConfigService } from "@/config/config.service";
import { UserService } from "@/user/user.service";

@Injectable()
export class AuthSessionService {
  constructor(private readonly configService: ConfigService, private readonly userService: UserService) {}

  async generateSessionToken(user: UserEntity): Promise<string> {
    return jwt.sign(user.id.toString(), this.configService.config.security.sessionSecret);
  }

  async getSessionUser(token: string): Promise<UserEntity> {
    try {
      const decoded: string = jwt.verify(token, this.configService.config.security.sessionSecret) as string;
      return this.userService.findUserById(parseInt(decoded));
    } catch (e) {
      return null;
    }
  }
}
