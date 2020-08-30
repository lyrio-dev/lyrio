import { Injectable } from "@nestjs/common";

import { FileService } from "./file/file.service";
import { RedisService } from "./redis/redis.service";

const REDIS_LOCK_MAINTAINCE_TASKS = "maintaince-tasks";

@Injectable()
export class AppService {
  constructor(private readonly redisService: RedisService, private readonly fileService: FileService) {}

  // TODO: Make the site read-only while running maintaince tasks.
  public async runMaintainceTasks(): Promise<void> {
    await this.redisService.lock(REDIS_LOCK_MAINTAINCE_TASKS, async () => {
      await this.fileService.runMaintainceTasks();
    });
  }
}
