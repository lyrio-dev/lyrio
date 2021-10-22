import { Injectable } from "@nestjs/common";

import { Redis } from "ioredis";
import { debounce } from "lodash";

import { RedisService } from "@/redis/redis.service";

import { PushGateway, PushService } from "./push.gateway";

// The key presents while the task is running. If the key doesn't present, the task is finished.
const REDIS_KEY_BACKGROUND_TASK_PROGRESS = "background-task-progress:%s";

// A BackgroundTaskProgress will be sent to this channel for each time of new progress.
const REDIS_CHANNEL_BACKGROUND_TASK_PROGRESS = "background-task-progress-event";

// Debounce the emitting of task progress.
const TASK_PROGRESS_DEBOUNCE_WAIT = 250;

interface BackgroundTaskProgress<ProgressDetail> {
  isFinished: boolean;
  detail?: ProgressDetail;
}

@Injectable()
export class BackgroundTaskProgressService {
  private readonly redisForSubscribe: Redis;

  private readonly redis: Redis;

  private readonly pushService: PushService<string, BackgroundTaskProgress<unknown>>;

  private readonly debouncedEmit: (taskKey: string, progressDetail: unknown) => Promise<void>;

  constructor(private readonly pushGateway: PushGateway, private readonly redisService: RedisService) {
    this.redis = this.redisService.getClient();
    this.redisForSubscribe = this.redisService.getClient();

    // subscription = taskKey
    this.pushService = this.pushGateway.registerPushType<string, BackgroundTaskProgress<unknown>>("background-task", {
      getInitialMessageForSubscription: async subscription => {
        const progressDetail = await this.getTaskProgress(subscription);
        return {
          isFinished: progressDetail == null,
          detail: progressDetail
        };
      },
      getRoomForSubscription: subscription => subscription
    });

    this.redisForSubscribe.on("message", (channel: string, message: string) => {
      const { taskKey, progress } = JSON.parse(message);
      this.pushService.push(taskKey, progress);
    });
    this.redisForSubscribe.subscribe(REDIS_CHANNEL_BACKGROUND_TASK_PROGRESS);

    this.debouncedEmit = debounce(this.emit.bind(this), TASK_PROGRESS_DEBOUNCE_WAIT);
  }

  async getTaskProgress<T>(taskKey: string): Promise<T> {
    try {
      return JSON.parse(await this.redis.get(REDIS_KEY_BACKGROUND_TASK_PROGRESS.format(taskKey)));
    } catch (e) {
      return null;
    }
  }

  async isTaskRunning(taskKey: string): Promise<boolean> {
    return !!(await this.redis.get(REDIS_KEY_BACKGROUND_TASK_PROGRESS.format(taskKey)));
  }

  private async emit(taskKey: string, progressDetail: unknown) {
    if (progressDetail != null)
      await this.redis.set(REDIS_KEY_BACKGROUND_TASK_PROGRESS.format(taskKey), JSON.stringify(progressDetail));
    else await this.redis.del(REDIS_KEY_BACKGROUND_TASK_PROGRESS.format(taskKey));

    await this.redis.publish(
      REDIS_CHANNEL_BACKGROUND_TASK_PROGRESS,
      JSON.stringify({
        taskKey,
        progress: <BackgroundTaskProgress<unknown>>{ isFinished: progressDetail == null, detail: progressDetail }
      })
    );
  }

  encodeSubscription(taskKey: string) {
    return this.pushService.encodeSubscription(taskKey);
  }

  async progress(taskKey: string, progressDetail: unknown): Promise<void> {
    await this.debouncedEmit(taskKey, progressDetail);
  }

  async finish(taskKey: string): Promise<void> {
    await this.debouncedEmit(taskKey, null);
  }

  startBackgroundTask<ProgressDetail>(
    taskKey: string,
    callback: (emitProgress: (progressDetail: ProgressDetail) => Promise<void>) => Promise<void>
  ): string {
    callback(progressDetail => this.progress(taskKey, progressDetail)).then(() => this.finish(taskKey));
    return this.encodeSubscription(taskKey);
  }
}
