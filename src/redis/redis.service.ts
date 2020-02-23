import { Injectable, OnModuleInit } from "@nestjs/common";
import Redis = require("ioredis");
import Redlock = require("redlock");

import { ConfigService } from "@/config/config.service";

@Injectable()
export class RedisService implements OnModuleInit {
  private readonly client: Redis.Redis;
  private readonly redlock: Redlock;
  private readonly untilReady: Promise<void>;

  constructor(private readonly configService: ConfigService) {
    this.client = new Redis(this.configService.config.services.redis, {
      enableReadyCheck: true
    });
    this.redlock = new Redlock([this.client]);

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

  public getClient(): Redis.Redis {
    return this.client.duplicate();
  }

  public async lock<T>(name: string, callback: () => Promise<T>) {
    const LOCK_TTL = 1000;

    const lock = await this.redlock.lock(name, LOCK_TTL);
    const timer = setInterval(() => lock.extend(LOCK_TTL), LOCK_TTL * 0.7);

    try {
      return await callback();
    } finally {
      clearInterval(timer);
      await lock.unlock();
    }
  }
}
