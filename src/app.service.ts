import { Injectable } from "@nestjs/common";

import { FileService } from "./file/file.service";
import { LockService } from "./redis/lock.service";

const REDIS_LOCK_MAINTAINCE_TASKS = "maintaince-tasks";

@Injectable()
export class AppService {
  constructor(private readonly lockService: LockService, private readonly fileService: FileService) {}

  // TODO: Make the site read-only while running maintaince tasks.
  async runMaintainceTasks(): Promise<void> {
    await this.lockService.lock(REDIS_LOCK_MAINTAINCE_TASKS, async () => {
      await this.fileService.runMaintainceTasks();
    });
  }
}
