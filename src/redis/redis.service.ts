import { Injectable, OnModuleInit } from "@nestjs/common";

import { ConfigService } from "@/config/config.service";
import * as Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit {
  private readonly client: Redis.Redis;
  private readonly untilReady: Promise<void>;

  constructor(public readonly configService: ConfigService) {
    this.client = new Redis(this.configService.config.services.redis, {
      enableReadyCheck: true
    });

    // TODO: Handle errors after connected?
    this.untilReady = new Promise((resolve, reject) => {
      this.client.once("ready", resolve);
      this.client.once("error", reject);
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.untilReady;
    } catch (e) {
      throw new Error(`Could not connect to Redis service: ${e}`);
    }
  }
}
