import { Injectable } from "@nestjs/common";
import { Redis } from "ioredis";

import { FileService } from "./file/file.service";
import { RedisService } from "./redis/redis.service";

// 1 hour
const SCHEDULED_TASK_INTERVAL = 1000 * 60 * 60;
const REDIS_LOCK_SCHEDULED_TASKS_LAST_RUN_TIME = "scheduledTasksLastRunTimeLock";
const REDIS_KEY_SCHEDULED_TASKS_LAST_RUN_TIME = "scheduledTasksLastRunTime";

@Injectable()
export class AppService {
  private readonly redis: Redis;

  constructor(private readonly redisService: RedisService, private readonly fileService: FileService) {
    this.redis = this.redisService.getClient();
  }

  public async runScheduledTasks() {
    const checkLastRunTime = async () => {
      const lastRunTime = Number(await this.redis.get(REDIS_KEY_SCHEDULED_TASKS_LAST_RUN_TIME)) || 0;
      return Date.now() - lastRunTime >= SCHEDULED_TASK_INTERVAL;
    };

    if (!(await checkLastRunTime())) return;

    await this.redisService.lock(REDIS_LOCK_SCHEDULED_TASKS_LAST_RUN_TIME, async () => {
      if (!(await checkLastRunTime())) return;

      await this.fileService.runScheduledTasks();
      await this.redis.set(REDIS_KEY_SCHEDULED_TASKS_LAST_RUN_TIME, Date.now());
    });
  }
}
