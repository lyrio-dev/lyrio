import { join } from "path";
import fs from "fs-extra";

import { Injectable } from "@nestjs/common";

import { Redis, ValueType } from "ioredis";
import { v4 as uuid } from "uuid";

import { RedisService } from "@/redis/redis.service";
import { delay } from "@/common/delay";

// Refer to scripts/lock.lua and scripts/read-write-lock.lua for details
interface RedisWithLock extends Redis {
  callLock(...args: ValueType[]): Promise<boolean>;
  callReadWriteLock(...args: ValueType[]): Promise<boolean>;
}

const LOCK_TTL = 5000;
const LOCK_TTL_RESET_INTERVAL = LOCK_TTL * 0.5;
const LOCK_RETRY_DELAY = 1000;
const LOCK_MAX_RETRY = 30;

const REDIS_KEY_RWLOCK_WRITE_INTENT = "rwlock:%s:write-intent";
const REDIS_KEY_RWLOCK_WRITE_LOCK = "rwlock:%s:write-lock";
const REDIS_KEY_RWLOCK_READERS = "rwlock:%s:readers";

@Injectable()
export class LockService {
  private redis: RedisWithLock;

  constructor(private readonly redisService: RedisService) {
    this.redis = this.redisService.getClient() as RedisWithLock;
    this.redis.defineCommand("callLock", {
      numberOfKeys: 1,
      lua: fs.readFileSync(join(__dirname, "scripts", "lock.lua")).toString("utf-8")
    });
    this.redis.defineCommand("callReadWriteLock", {
      numberOfKeys: 3,
      lua: fs.readFileSync(join(__dirname, "scripts", "read-write-lock.lua")).toString("utf-8")
    });
  }

  /**
   * `doUnlock` and `doRefresh` returns `false` when there's a lock-refresh failure
   */
  private async internalLock<T>(
    name: string,
    doLock: () => Promise<boolean>,
    doUnlock: () => Promise<boolean>,
    doRefresh: () => Promise<boolean>,
    callback: () => Promise<T>
  ): Promise<T> {
    // Try locking
    let retries = 0;

    /* eslint-disable no-await-in-loop */
    while (!(await doLock())) {
      if (++retries === LOCK_MAX_RETRY)
        throw new Error(`Retries limit exceeded while attempting to lock ${JSON.stringify(name)}`);
      await delay(LOCK_RETRY_DELAY);
    }
    /* eslint-enable no-await-in-loop */

    // If the locked lock token mismatch, means the lock expired while this node hold the lock
    // This is a dangerous situation
    const onLockTokenMismatch = () => {
      throw new Error(`Lock refresh failure detected on ${JSON.stringify(name)}, is the system overloaded?`);
    };

    let unlocked = false;

    const refreshLockExpire = async () => {
      if (!(await doRefresh())) {
        onLockTokenMismatch();
        return;
      }

      // `unlock` may be called during the `await` above, so if that happens do not set the timer
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      if (!unlocked) setRefreshTimer();
    };

    // Use a timer to refresh the lock's TTL
    let refreshTimer: ReturnType<typeof setTimeout>;
    const setRefreshTimer = () => {
      refreshTimer = setTimeout(refreshLockExpire, LOCK_TTL_RESET_INTERVAL);
    };
    setRefreshTimer();

    const unlock = async () => {
      if (unlocked) return;
      unlocked = true;

      clearTimeout(refreshTimer);

      if (!(await doUnlock())) {
        onLockTokenMismatch();
      }
    };

    try {
      return await callback();
    } finally {
      await unlock();
    }
  }

  /**
   * Basic lock with Redis.
   * @param name The lock name.
   * @param callback The function to execute while the lock is held.
   * @return The value returned in `callback`.
   */
  async lock<T>(name: string, callback: () => Promise<T>): Promise<T> {
    // Generate a unique lock token
    const lockToken = uuid();

    return await this.internalLock(
      name,
      () => this.redis.callLock(name, "lock", lockToken, LOCK_TTL),
      () => this.redis.callLock(name, "unlock", lockToken),
      () => this.redis.callLock(name, "refresh", lockToken, LOCK_TTL),
      callback
    );
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
    const keys = [REDIS_KEY_RWLOCK_WRITE_INTENT, REDIS_KEY_RWLOCK_WRITE_LOCK, REDIS_KEY_RWLOCK_READERS].map(key =>
      key.format(name)
    );

    if (type === "Read") {
      return await this.internalLock(
        `Read(${name})`,
        () => this.redis.callReadWriteLock(...keys, "read_lock", LOCK_TTL),
        () => this.redis.callReadWriteLock(...keys, "read_unlock"),
        () => this.redis.callReadWriteLock(...keys, "read_refresh", LOCK_TTL),
        callback
      );
    } else {
      const lockToken = uuid();

      return await this.internalLock(
        `Write(${name})`,
        () => this.redis.callReadWriteLock(...keys, "write_lock", lockToken, LOCK_TTL),
        () => this.redis.callReadWriteLock(...keys, "write_unlock", lockToken),
        () => this.redis.callReadWriteLock(...keys, "write_refresh", lockToken, LOCK_TTL),
        callback
      );
    }
  }
}
