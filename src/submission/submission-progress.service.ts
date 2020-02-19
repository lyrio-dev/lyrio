import { Injectable, Logger } from "@nestjs/common";
import { Redis } from "ioredis";

import { SubmissionProgress, SubmissionProgressType } from "./submission-progress.interface";
import { RedisService } from "@/redis/redis.service";
import { SubmissionProgressGateway } from "./submission-progress.gateway";

const REDIS_KEY_SUBMISSION_PROGRESS = "submission_progress_";
const REDIS_CHANNEL_SUBMISSION_PROGRESS = "submission_progress";

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
      const { submissionId, progress } = JSON.parse(message);
      this.consumeSubmissionProgress(submissionId, progress);
    });
    this.redisSubscribe.subscribe(REDIS_CHANNEL_SUBMISSION_PROGRESS);
  }

  private async consumeSubmissionProgress(submissionId: number, progress: SubmissionProgress) {
    Logger.log("Consume progress for submission " + submissionId);
    this.submissionProgressGateway.onSubmissionProgress(submissionId, progress);
  }

  // If the progress type is "Finished", this method is called after the progress
  // result is stored in the database.
  public async onSubmissionProgressReported(submissionId: number, progress: SubmissionProgress): Promise<void> {
    Logger.log(`Progress for submission ${submissionId} received, pushing to Redis`);
    if (progress.progressType === SubmissionProgressType.Finished) {
      await this.redis.del(REDIS_KEY_SUBMISSION_PROGRESS + submissionId);
    } else {
      await this.redis.set(REDIS_KEY_SUBMISSION_PROGRESS + submissionId, JSON.stringify(progress));
    }

    // This will call this.consumeSubmissionProgress
    await this.redis.publish(
      REDIS_CHANNEL_SUBMISSION_PROGRESS,
      JSON.stringify({
        submissionId: submissionId,
        progress: progress
      })
    );
  }

  public async getSubmissionProgress(submissionId: number): Promise<SubmissionProgress> {
    const str = await this.redis.get(REDIS_KEY_SUBMISSION_PROGRESS + submissionId);
    try {
      return JSON.parse(str);
    } catch (e) {
      return null;
    }
  }
}
