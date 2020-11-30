import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { InjectConnection } from "@nestjs/typeorm";

import { Connection } from "typeorm";

import { logger } from "@/logger";
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
  Earliest = "Earliest"
}

interface SubmissionStatisticsField {
  field: keyof SubmissionEntity;
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
  Earliest: {
    field: "submitTime",
    sort: "ASC"
  }
};

// We use Redis to cache the result of submission statistics
// Each time a submission is updated, if it's in the ranklist, or it should be inserted to the ranklist
// the cache will be purged
type SubmissionStatisticsCache = [submissionId: number, submitterId: number, fieldValue: number];
const REDIS_KEY_SUBMISSION_STATISTICS = "submission-statistics:%d:%s";

const REDIS_KEY_SUBMISSION_SCORE_STATISTICS = "submission-score-statistics:%d";

// Only top 100 users' submissions will be in the statistics
const SUBMISSION_STATISTICS_TOP_COUNT = 100;

@Injectable()
export class SubmissionStatisticsService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @Inject(forwardRef(() => SubmissionService))
    private readonly submissionService: SubmissionService,
    private readonly redisService: RedisService
  ) {}

  private async parseFromRedis<T>(key: string): Promise<T> {
    const str = await this.redisService.cacheGet(key);
    try {
      return JSON.parse(str);
    } catch (e) {
      return null;
    }
  }

  async querySubmissionStatisticsAndCount(
    problem: ProblemEntity,
    statisticsType: SubmissionStatisticsType,
    skipCount: number,
    takeCount: number
  ): Promise<[submissions: SubmissionEntity[], count: number]> {
    const { field, sort } = submissionStatisticsFields[statisticsType];

    const key = REDIS_KEY_SUBMISSION_STATISTICS.format(problem.id, statisticsType);
    let tuples = await this.parseFromRedis<SubmissionStatisticsCache[]>(key);

    const rebuildCache = async () => {
      const aggregateFunction = sort === "ASC" ? "MIN" : "MAX";
      const queryResult: { submissionId: number; submitterId: number; fieldValue: unknown }[] = await this.connection
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
      await this.redisService.cacheSet(key, JSON.stringify(tuples));
    };

    if (!tuples) await rebuildCache();

    const query = async () => {
      const ids = tuples.filter((_, i) => i >= skipCount && i < skipCount + takeCount).map(([id]) => id);
      return await this.submissionService.findSubmissionsByExistingIds(ids);
    };

    let submissions = await query();
    if (submissions.some(submission => !submission)) {
      await rebuildCache();
      submissions = await query();
    }

    return [submissions.filter(submission => submission), tuples.length];
  }

  /**
   * Return how many submissions with each score (0 ~ 100) are there.
   */
  async querySubmissionScoreStatistics(problem: ProblemEntity): Promise<number[]> {
    const key = REDIS_KEY_SUBMISSION_SCORE_STATISTICS.format(problem.id);
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

    await this.redisService.cacheSet(key, JSON.stringify(result));

    return result;
  }

  /**
   * This function is called after a submission's updated, to determine which caches of statistics should be purged.
   *
   * A newly-added submission won't call this function.
   */
  async onSubmissionUpdated(oldSubmission: SubmissionEntity, submission?: SubmissionEntity): Promise<void> {
    // Submission score statistics
    if (!submission || oldSubmission.score !== submission.score) {
      await this.redisService.cacheDelete(REDIS_KEY_SUBMISSION_SCORE_STATISTICS.format(oldSubmission.problemId));
    }

    // Submission statistics
    if (
      oldSubmission.status !== SubmissionStatus.Accepted &&
      (!submission || submission.status !== SubmissionStatus.Accepted)
    )
      return;
    await Promise.all(
      Object.values(SubmissionStatisticsType).map(async statisticsType => {
        const { field, sort } = submissionStatisticsFields[statisticsType];
        const key = REDIS_KEY_SUBMISSION_STATISTICS.format(oldSubmission.problemId, statisticsType);
        const tuples = await this.parseFromRedis<SubmissionStatisticsCache[]>(key);

        if (!tuples) return;

        const isFirstBetter = (value: number, anotherValue: number) =>
          (sort === "ASC" && value < anotherValue) || (sort === "DESC" && value > anotherValue);

        const shouldCacheBePurged = () => {
          const oldSubmissionInList = tuples.some(([id]) => id === oldSubmission.id);

          // If the old value is in the list
          const oldValue = Number(oldSubmission[field]);
          const newValue = submission && Number(submission[field]);
          if (oldSubmissionInList) {
            return oldValue !== newValue || !submission || submission.status !== SubmissionStatus.Accepted;
          }
          if (!submission || submission.status !== SubmissionStatus.Accepted) return false;

          // If the new submission is Accepted, check if it's better than the submitter's best
          const submitterBest = tuples.find(([, submitterId]) => submitterId === oldSubmission.submitterId);
          if (submitterBest != null) {
            const [, , submitterBestValue] = submitterBest;
            return newValue != null && isFirstBetter(newValue, submitterBestValue);
          }

          // If the ranklist is not full
          if (tuples.length < SUBMISSION_STATISTICS_TOP_COUNT) return true;

          // If the ranklist is full, but new value is better than the last of the ranklist
          const [, , lastValue] = tuples[tuples.length - 1];
          return newValue != null && isFirstBetter(newValue, lastValue);
        };

        if (shouldCacheBePurged()) {
          logger.log(
            `Purging submission statistics cache: problemId = ${oldSubmission.problemId}, statisticsType = ${statisticsType}`
          );
          await this.redisService.cacheDelete(key);
        }
      })
    );
  }

  async onProblemDeleted(problemId: number): Promise<void> {
    await Promise.all([
      ...Object.values(SubmissionStatisticsType).map(type =>
        this.redisService.cacheDelete(REDIS_KEY_SUBMISSION_STATISTICS.format(problemId, type))
      ),
      this.redisService.cacheDelete(REDIS_KEY_SUBMISSION_SCORE_STATISTICS.format(problemId))
    ]);
  }
}
