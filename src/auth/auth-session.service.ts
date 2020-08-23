import { Injectable } from "@nestjs/common";
import * as jwt from "jsonwebtoken";
import { Redis, ValueType } from "ioredis";
import { join } from "path";
import fs = require("fs-extra");

import { UserEntity } from "@/user/user.entity";
import { ConfigService } from "@/config/config.service";
import { UserService } from "@/user/user.service";
import { RedisService } from "@/redis/redis.service";

// Refer to scripts/session-manager.lua for session management details
interface RedisWithSessionManager extends Redis {
  callSessionManager(...args: ValueType[]): Promise<any>;
}

interface SessionInfo {
  loginIp: string;
  userAgent: string;
  loginTime: number;
}

@Injectable()
export class AuthSessionService {
  private redis: RedisWithSessionManager;

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly redisService: RedisService
  ) {
    this.redis = this.redisService.getClient() as RedisWithSessionManager;
    this.redis.defineCommand("callSessionManager", {
      numberOfKeys: 0,
      lua: fs.readFileSync(join(__dirname, "scripts", "session-manager.lua")).toString("utf-8")
    });
  }

  async newSession(user: UserEntity, loginIp: string, userAgent: string): Promise<string> {
    const timeStamp = +new Date();
    const sessionInfo: SessionInfo = {
      loginIp: loginIp,
      userAgent: userAgent,
      loginTime: timeStamp
    };

    const sessionId = await this.redis.callSessionManager("new", timeStamp, user.id, JSON.stringify(sessionInfo));

    return jwt.sign(user.id.toString() + " " + sessionId, this.configService.config.security.sessionSecret);
  }

  private decodeSessionKey(sessionKey: string): [number, number] {
    const jwtString = jwt.verify(sessionKey, this.configService.config.security.sessionSecret) as string;
    return jwtString.split(" ").map(s => parseInt(s)) as [number, number];
  }

  async endSession(sessionKey: string): Promise<void> {
    try {
      const [userId, sessionId] = this.decodeSessionKey(sessionKey);
      await this.redis.callSessionManager("end", userId, sessionId);
    } catch (e) {}
  }

  async accessSession(sessionKey: string): Promise<UserEntity> {
    try {
      const [userId, sessionId] = this.decodeSessionKey(sessionKey);

      const success = await this.redis.callSessionManager("access", +new Date(), userId, sessionId);
      if (!success) return null;

      return this.userService.findUserById(userId);
    } catch (e) {
      return null;
    }
  }
}
