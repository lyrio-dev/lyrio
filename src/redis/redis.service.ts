import { Injectable, OnModuleInit } from "@nestjs/common";
import Redis = require("ioredis");
import Redlock = require("redlock");

import { ConfigService } from "@/config/config.service";

async function sleep() {
  const SLEEP_TIME = 20;
  await new Promise(resolve => setTimeout(resolve, SLEEP_TIME));
}

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

  /**
   * Basic lock with Redis.
   * @param name The lock name.
   * @param callback The function to execute while the lock is held.
   * @return The value returned in `callback`.
   */
  public async lock<T>(name: string, callback: () => Promise<T>): Promise<T>;

  /**
   * Basic lock with Redis.
   * @param name The lock name.
   * @param callback The function to execute while the lock is held.
   * @return The function to unlock.
   */
  public async lock(name: string): Promise<() => Promise<void>>;

  public async lock<T>(name: string, callback?: () => Promise<T>): Promise<T | (() => Promise<void>)> {
    const LOCK_TTL = 5000;

    const lock = await this.redlock.lock(name, LOCK_TTL);
    const timer = setInterval(() => lock.extend(LOCK_TTL), LOCK_TTL * 0.5);

    let unlocked = false;
    const unlock = async () => {
      if (unlocked) return;
      clearInterval(timer);
      unlocked = true;

      await lock.unlock();
    };

    if (callback) {
      try {
        return await callback();
      } finally {
        await unlock();
      }
    } else {
      return unlock;
    }
  }

  /**
   * Lock a read-write-lock for a reader or writer.
   * Multiple readers can hold the same lock at the same time with no writer.
   * Only one writer can hold the same lock at the same time with no reader.
   * @param name The lock name.
   * @param type The operation type, `"READ"` or `"WRITE"`.
   * @param callback The function to execute while the lock is held.
   * @return The value returned in `callback`.
   */
  public async lockReadWrite<T>(name: string, type: "READ" | "WRITE", callback: () => Promise<T>): Promise<T> {
    const lockRead = async () => {
      let unlock: () => Promise<void>;
      try {
        for (;;) {
          unlock = await this.lock(name);
          const numWritersWaiting = Number(await this.client.get(name + "_NUM_WRITERS_WAITING")) || 0;
          const writerActive = Number(await this.client.get(name + "_WRITER_ACTIVE")) || 0;

          if (numWritersWaiting > 0 || writerActive) {
            await unlock();
            await sleep();
          } else {
            break;
          }
        }

        const numReadersActive = Number(await this.client.get(name + "_NUM_READERS_ACTIVE")) || 0;
        await this.client.set(name + "_NUM_READERS_ACTIVE", numReadersActive + 1);

        await unlock();
      } finally {
        if (unlock) await unlock(); // Ensure unlocked
      }
    };

    const unlockRead = async () =>
      await this.lock(name, async () => {
        const numReadersActive = Number(await this.client.get(name + "_NUM_READERS_ACTIVE")) || 0;
        if (numReadersActive <= 1) {
          await this.client.del(name + "_NUM_READERS_ACTIVE");
        } else {
          await this.client.set(name + "_NUM_READERS_ACTIVE", numReadersActive - 1);
        }
      });

    const lockWrite = async () => {
      let unlock = await this.lock(name);

      const numWritersWaiting = Number(await this.client.get(name + "_NUM_WRITERS_WAITING")) || 0;
      await this.client.set(name + "_NUM_WRITERS_WAITING", numWritersWaiting + 1);

      try {
        for (;;) {
          const numReadersActive = Number(await this.client.get(name + "_NUM_READERS_ACTIVE")) || 0;
          const writerActive = Number(await this.client.get(name + "_WRITER_ACTIVE")) || 0;

          if (numReadersActive > 0 || writerActive) {
            await unlock();
            await sleep();
            unlock = await this.lock(name);
          } else {
            break;
          }
        }

        const numWritersWaiting = Number(await this.client.get(name + "_NUM_WRITERS_WAITING")) || 0;
        if (numWritersWaiting === 1) {
          await this.client.del(name + "_NUM_WRITERS_WAITING");
        } else {
          await this.client.set(name + "_NUM_WRITERS_WAITING", numWritersWaiting - 1);
        }
        await this.client.set(name + "_WRITER_ACTIVE", 1);

        await unlock();
      } finally {
        if (unlock) await unlock(); // Ensure unlocked
      }
    };

    const unlockWrite = async () =>
      await this.lock(name, async () => {
        await this.client.del(name + "_WRITER_ACTIVE");
      });

    if (type === "READ") {
      try {
        await lockRead();
        return await callback();
      } finally {
        await unlockRead();
      }
    } else {
      try {
        await lockWrite();
        return await callback();
      } finally {
        await unlockWrite();
      }
    }
  }
}
