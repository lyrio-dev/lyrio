import { Injectable, OnModuleInit } from "@nestjs/common";

import Redis from "ioredis";
import Redlock from "redlock";

import { ConfigService } from "@/config/config.service";

const REDIS_CACHE_EXPIRE_TIME = 60 * 60 * 24 * 30; // 7 days
const REDIS_KEY_RWLOCK_NUM_READERS_ACTIVE = "%s_NUM_READERS_ACTIVE";
const REDIS_KEY_RWLOCK_NUM_WRITERS_WAITING = "%s_NUM_WRITERS_WAITING";
const REDIS_KEY_RWLOCK_WRITER_ACTIVE = "%s_WRITER_ACTIVE";

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

  async cacheSet(key: string, value: string): Promise<void> {
    await this.client.setex(key, REDIS_CACHE_EXPIRE_TIME, value);
  }

  async cacheGet(key: string): Promise<string> {
    return await this.client.get(key);
  }

  async cacheDelete(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Get a Redis client object to execute Redis commands directly.
   *
   * Please use `cacheGet` and `cacheSet` for caching since they handle the expire time automatically.
   */
  getClient(): Redis.Redis {
    return this.client.duplicate();
  }

  /**
   * Basic lock with Redis.
   * @param name The lock name.
   * @param callback The function to execute while the lock is held.
   * @return The value returned in `callback`.
   */
  async lock<T>(name: string, callback: () => Promise<T>): Promise<T>;

  /**
   * Basic lock with Redis.
   * @param name The lock name.
   * @param callback The function to execute while the lock is held.
   * @return The function to unlock.
   */
  async lock(name: string): Promise<() => Promise<void>>;

  async lock<T>(name: string, callback?: () => Promise<T>): Promise<T | (() => Promise<void>)> {
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
   * @param type The operation type, `"Read"` or `"Write"`.
   * @param callback The function to execute while the lock is held.
   * @return The value returned in `callback`.
   */
  async lockReadWrite<T>(name: string, type: "Read" | "Write", callback: () => Promise<T>): Promise<T> {
    const lockRead = async () => {
      let unlock: () => Promise<void>;
      try {
        /* eslint-disable no-await-in-loop */
        for (;;) {
          unlock = await this.lock(name);
          const numWritersWaiting =
            Number(await this.client.get(REDIS_KEY_RWLOCK_NUM_WRITERS_WAITING.format(name))) || 0;
          const writerActive = Number(await this.client.get(REDIS_KEY_RWLOCK_WRITER_ACTIVE.format(name))) || 0;

          if (numWritersWaiting > 0 || writerActive) {
            await unlock();
            await sleep();
          } else {
            break;
          }
        }
        /* eslint-enable no-await-in-loop */

        const numReadersActive = Number(await this.client.get(REDIS_KEY_RWLOCK_NUM_READERS_ACTIVE.format(name))) || 0;
        await this.client.set(REDIS_KEY_RWLOCK_NUM_READERS_ACTIVE.format(name), numReadersActive + 1);

        await unlock();
      } finally {
        if (unlock) await unlock(); // Ensure unlocked
      }
    };

    const unlockRead = async () =>
      await this.lock(name, async () => {
        const numReadersActive = Number(await this.client.get(REDIS_KEY_RWLOCK_NUM_READERS_ACTIVE.format(name))) || 0;
        if (numReadersActive <= 1) {
          await this.client.del(REDIS_KEY_RWLOCK_NUM_READERS_ACTIVE.format(name));
        } else {
          await this.client.set(REDIS_KEY_RWLOCK_NUM_READERS_ACTIVE.format(name), numReadersActive - 1);
        }
      });

    const lockWrite = async () => {
      let unlock = await this.lock(name);

      const numWritersWaiting = Number(await this.client.get(REDIS_KEY_RWLOCK_NUM_WRITERS_WAITING.format(name))) || 0;
      await this.client.set(REDIS_KEY_RWLOCK_NUM_WRITERS_WAITING.format(name), numWritersWaiting + 1);

      try {
        /* eslint-disable no-await-in-loop */
        for (;;) {
          const numReadersActive = Number(await this.client.get(REDIS_KEY_RWLOCK_NUM_READERS_ACTIVE.format(name))) || 0;
          const writerActive = Number(await this.client.get(REDIS_KEY_RWLOCK_WRITER_ACTIVE.format(name))) || 0;

          if (numReadersActive > 0 || writerActive) {
            await unlock();
            await sleep();
            unlock = await this.lock(name);
          } else {
            break;
          }
        }
        /* eslint-enable no-await-in-loop */

        // eslint-disable-next-line @typescript-eslint/no-shadow
        const numWritersWaiting = Number(await this.client.get(REDIS_KEY_RWLOCK_NUM_WRITERS_WAITING.format(name))) || 0;
        if (numWritersWaiting === 1) {
          await this.client.del(REDIS_KEY_RWLOCK_NUM_WRITERS_WAITING.format(name));
        } else {
          await this.client.set(REDIS_KEY_RWLOCK_NUM_WRITERS_WAITING.format(name), numWritersWaiting - 1);
        }
        await this.client.set(REDIS_KEY_RWLOCK_WRITER_ACTIVE.format(name), 1);

        await unlock();
      } finally {
        if (unlock) await unlock(); // Ensure unlocked
      }
    };

    const unlockWrite = async () =>
      await this.lock(name, async () => {
        await this.client.del(REDIS_KEY_RWLOCK_WRITER_ACTIVE.format(name));
      });

    if (type === "Read") {
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
