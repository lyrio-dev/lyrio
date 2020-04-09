import { Injectable, Logger, Inject, forwardRef } from "@nestjs/common";
import { InjectConnection } from "@nestjs/typeorm";
import { Connection } from "typeorm";
import { Redis } from "ioredis";

import { RedisService } from "@/redis/redis.service";
import { ProblemEntity } from "@/problem/problem.entity";
import { SubmissionEntity } from "./submission.entity";
import { SubmissionStatus } from "./submission-status.enum";
import { SubmissionService } from "./submission.service";

// Along with submission statistics, this file also provide the submission score statistics

export enum SubmissionStatisticsType {
  Fastest = "Fastest",
  MinMemory = "MinMemory",
  MinAnswerSize = "MinAnswerSize",
  Earlist = "Earlist"
}

interface SubmissionStatisticsField {
  field: string;
  sort: "ASC" | "DESC";
}

const submissionStatisticsFields: Record<SubmissionStatisticsType, SubmissionStatisticsField> = {
  Fastest: {
    field: "timeUsed",
    sort: "ASC"
  },
  MinMemory: {
    field: "memoryUsed",
    sort: "ASC"
  },
  MinAnswerSize: {
    field: "answerSize",
    sort: "ASC"
  },
  Earlist: {
    field: "submitTime",
    sort: "ASC"
  }
};

// We use Redis to cache the result of submission statistics
// The data in redis is [submissionId, fieldValue]
// Each time a submission is updated, if it's in the ranklist, or it should be inserted to the ranklist
// the cache will be purged
const REDIS_KEY_SUBMISSION_STATISTICS = "submissionStatistics";

const REDIS_KEY_SUBMISSION_SCORE_STATISTICS = "submissionScoreStatistics";

// Only top 100 users' submissions will be in the statistics
const SUBMISSION_STATISTICS_TOP_COUNT = 100;

@Injectable()
export class SubmissionStatisticsService {
  private redis: Redis;

  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @Inject(forwardRef(() => SubmissionService))
    private readonly submissionService: SubmissionService,
    private readonly redisService: RedisService
  ) {
    this.redis = this.redisService.getClient();
  }

  // tuples(submissionId, submitterId, fieldValue)
  private getRedisKeySubmissionStatistics(problemId: number, statisticsType: SubmissionStatisticsType) {
    return REDIS_KEY_SUBMISSION_STATISTICS + "_" + problemId + "_" + statisticsType;
  }

  private getRedisKeySubmissionScoreStatistics(problemId: number) {
    return REDIS_KEY_SUBMISSION_SCORE_STATISTICS + "_" + problemId;
  }

  private async parseFromRedis<T>(key: string): Promise<T> {
    const str = await this.redis.get(key);
    try {
      return JSON.parse(str);
    } catch (e) {}
  }

  public async querySubmissionStatisticsAndCount(
    problem: ProblemEntity,
    statisticsType: SubmissionStatisticsType,
    skipCount: number,
    takeCount: number
  ): Promise<[SubmissionEntity[], number]> {
    const { field, sort } = submissionStatisticsFields[statisticsType];

    const key = this.getRedisKeySubmissionStatistics(problem.id, statisticsType);
    let tuples = await this.parseFromRedis<[number, number, number][]>(key);

    if (!tuples) {
      const aggregateFunction = sort === "ASC" ? "MIN" : "MAX";
      const queryResult: { submissionId: number; submitterId: number; fieldValue: any }[] = await this.connection
        .createQueryBuilder()
        .select("submission.id", "submissionId")
        .addSelect("submission.submitterId", "submitterId")
        .addSelect("statistics.fieldValue", "fieldValue")
        .from(
          queryBuilder =>
            queryBuilder
              .select("submitterId")
              .addSelect(`${aggregateFunction}(${field})`, "fieldValue")
              .from(SubmissionEntity, "submission")
              .andWhere("status = :status", { status: SubmissionStatus.Accepted })
              .andWhere("problemId = :problemId", { problemId: problem.id })
              .groupBy("submitterId")
              .orderBy("fieldValue", sort)
              .limit(SUBMISSION_STATISTICS_TOP_COUNT),
          "statistics"
        )
        .innerJoin(
          SubmissionEntity,
          "submission",
          `submission.submitterId = statistics.submitterId AND submission.${field} = statistics.fieldValue AND submission.problemId = :problemId AND submission.status = :status`,
          {
            problemId: problem.id,
            status: SubmissionStatus.Accepted
          }
        )
        .groupBy("submission.submitterId")
        .orderBy("fieldValue", sort)
        .getRawMany();
      tuples = queryResult.map(result => [result.submissionId, result.submitterId, Number(result.fieldValue)]);
      await this.redis.set(key, JSON.stringify(tuples));
    }

    const resultIds = tuples.filter((_, i) => i >= skipCount && i < skipCount + takeCount).map(([id]) => id);
    return [await this.submissionService.findSubmissionsByExistingIds(resultIds), tuples.length];
  }

  /**
   * Return how many submissions with each score (0 ~ 100) are there.
   */
  public async querySubmissionScoreStatistics(problem: ProblemEntity): Promise<number[]> {
    const key = this.getRedisKeySubmissionScoreStatistics(problem.id);
    const cachedResult = await this.parseFromRedis<number[]>(key);
    if (cachedResult) return cachedResult;

    const queryResult: { score: string; count: string }[] = await this.connection
      .createQueryBuilder()
      .select("submission.score", "score")
      .addSelect("COUNT(*)", "count")
      .from(SubmissionEntity, "submission")
      .where("submission.problemId = :problemId", { problemId: problem.id })
      .andWhere("submission.score IS NOT NULL")
      .groupBy("submission.score")
      .getRawMany();
    const result = new Array(101).fill(0);
    for (const item of queryResult) result[item.score] = Number(item.count);

    await this.redis.set(key, JSON.stringify(result));

    return result;
  }

  /**
   * This function is called after a submission's updated, to determine which caches of statistics should be purged.
   *
   * A newly-added submission won't call this function.
   */
  public async onSubmissionUpdated(oldSubmission: SubmissionEntity, submission?: SubmissionEntity): Promise<void> {
    // Submission score statistics
    if (!submission || oldSubmission.score !== submission.score) {
      await this.redis.del(this.getRedisKeySubmissionScoreStatistics(oldSubmission.problemId));
    }

    // Submission statistics
    if (
      oldSubmission.status !== SubmissionStatus.Accepted &&
      (!submission || submission.status !== SubmissionStatus.Accepted)
    )
      return;
    for (const statisticsType of Object.values(SubmissionStatisticsType)) {
      const { field, sort } = submissionStatisticsFields[statisticsType];
      const key = this.getRedisKeySubmissionStatistics(oldSubmission.problemId, statisticsType);
      const tuples = await this.parseFromRedis<[number, number, number][]>(key);

      if (!tuples || tuples.length === 0) continue;

      const isFirstBetter = (value: number, anotherValue: number) => {
        return (sort === "ASC" && value < anotherValue) || (sort === "DESC" && value > anotherValue);
      };

      const shouldCacheBePurged = () => {
        const oldSubmissionInList = tuples.some(([id]) => id === oldSubmission.id);

        // If the old value is in the list
        const oldValue = Number(oldSubmission[field]),
          newValue = submission && Number(submission[field]);
        if (oldSubmissionInList) {
          return oldValue !== newValue || !submission || submission.status !== SubmissionStatus.Accepted;
        } else {
          if (!submission || submission.status !== SubmissionStatus.Accepted) return false;

          // If the new submission is Accepted, check if it's better than the submitter's best
          const submitterBestValue = tuples.find(
            ([submissionId, submitterId]) => submitterId === oldSubmission.submitterId
          )[2];
          if (submitterBestValue != null) {
            return newValue != null && isFirstBetter(newValue, submitterBestValue);
          }

          // If the new value is better than the last of the ranklist
          const [lastId, lastSubmitterId, lastValue] = tuples[tuples.length - 1];
          return newValue != null && isFirstBetter(newValue, lastValue);
        }
      };

      if (shouldCacheBePurged()) {
        Logger.log(
          `Purging submission statistics cache: problemId = ${oldSubmission.problemId}, statisticsType = ${statisticsType}`
        );
        await this.redis.del(key);
      }
    }
  }

  public async onProblemDeleted(problemId: number): Promise<void> {
    await Promise.all([
      ...Object.values(SubmissionStatisticsType).map(type =>
        this.redis.del(this.getRedisKeySubmissionStatistics(problemId, type))
      ),
      this.redis.del(this.getRedisKeySubmissionScoreStatistics(problemId))
    ]);
  }
}
