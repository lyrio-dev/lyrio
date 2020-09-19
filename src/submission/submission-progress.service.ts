import { Injectable, Logger } from "@nestjs/common";

import { Redis } from "ioredis";

import { RedisService } from "@/redis/redis.service";

import { SubmissionProgress, SubmissionProgressType } from "./submission-progress.interface";
import { SubmissionProgressGateway } from "./submission-progress.gateway";

export enum SubmissionEventType {
  Progress,
  Canceled,
  Deleted
}

const REDIS_KEY_SUBMISSION_PROGRESS = "submission-progress:%d";
const REDIS_CHANNEL_SUBMISSION_EVENT = "submission-event";

// The process for after a progress received:
// 1. If its type is "Finished", it's converted to a "result" and stored to the database,
//    anything related to the submission will be updated, its previous progress will be removed from Redis.
//    Otherwise (non-finished) the progress is stored to Redis.
// 2. A message is published to other all clusters to tell all clusters about the progress.
// 3. Once a cluster recived the Redis message of progress, it will lookup for its clients who has subscribed
//    the submission's progress and send them the progress via WebSocket.
@Injectable()
export class SubmissionProgressService {
  private readonly redisSubscribe: Redis;

  private readonly redis: Redis;

  constructor(
    private readonly redisService: RedisService,
    private readonly submissionProgressGateway: SubmissionProgressGateway
  ) {
    this.redis = this.redisService.getClient();
    this.redisSubscribe = this.redisService.getClient();

    this.redisSubscribe.on("message", (channel: string, message: string) => {
      const { submissionId, type, progress } = JSON.parse(message);
      this.onSubmissionEvent(submissionId, type, progress);
    });
    this.redisSubscribe.subscribe(REDIS_CHANNEL_SUBMISSION_EVENT);
  }

  private async onSubmissionEvent(submissionId: number, type: SubmissionEventType, progress?: SubmissionProgress) {
    Logger.log(`Consume event for submission ${submissionId}`);
    this.submissionProgressGateway.onSubmissionEvent(submissionId, type, progress);
  }

  // If the progress type is "Finished", this method is called after the progress
  // result is stored in the database.
  public async emitSubmissionEvent(
    submissionId: number,
    type: SubmissionEventType,
    progress?: SubmissionProgress
  ): Promise<void> {
    Logger.log(`Progress for submission ${submissionId} received, pushing to Redis`);
    if (type === SubmissionEventType.Progress && progress.progressType !== SubmissionProgressType.Finished) {
      await this.redis.set(REDIS_KEY_SUBMISSION_PROGRESS.format(submissionId), JSON.stringify(progress));
    } else {
      await this.redis.del(REDIS_KEY_SUBMISSION_PROGRESS.format(submissionId));
    }

    // This will call this.onSubmissionEvent
    await this.redis.publish(
      REDIS_CHANNEL_SUBMISSION_EVENT,
      JSON.stringify({
        submissionId,
        type,
        progress
      })
    );
  }

  public async getPendingSubmissionProgress(submissionId: number): Promise<SubmissionProgress> {
    const str = await this.redis.get(REDIS_KEY_SUBMISSION_PROGRESS.format(submissionId));
    try {
      return JSON.parse(str);
    } catch (e) {
      return null;
    }
  }
}
