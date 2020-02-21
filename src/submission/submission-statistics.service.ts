import { Injectable, Logger, Inject, forwardRef } from "@nestjs/common";
import { InjectConnection } from "@nestjs/typeorm";
import { Connection } from "typeorm";
import { Redis } from "ioredis";

import { RedisService } from "@/redis/redis.service";
import { ProblemEntity } from "@/problem/problem.entity";
import { SubmissionEntity } from "./submission.entity";
import { SubmissionStatus } from "./submission-status.enum";
import { SubmissionService } from "./submission.service";

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
const REDIS_KEY_SUBMISSION_STATISTICS = "SUBMISSION_STATISTICS_";

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
  private async getIdAndValuesFromRedis(key: string): Promise<[number, number, number][]> {
    const str = await this.redis.get(key);
    let tuples: [number, number, number][];
    try {
      tuples = JSON.parse(str);
    } catch (e) {}
    return tuples;
  }

  public async querySubmissionStatisticsAndCount(
    problem: ProblemEntity,
    statisticsType: SubmissionStatisticsType,
    skipCount: number,
    takeCount: number
  ): Promise<[SubmissionEntity[], number]> {
    const { field, sort } = submissionStatisticsFields[statisticsType];

    const key = REDIS_KEY_SUBMISSION_STATISTICS + problem.id + "_" + statisticsType;
    let tuples = await this.getIdAndValuesFromRedis(key);

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
              .where("isPublic = 1")
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
          `submission.submitterId = statistics.submitterId AND submission.${field} = statistics.fieldValue`
        )
        .groupBy("submission.submitterId")
        .orderBy("fieldValue", sort)
        .getRawMany();
      tuples = queryResult.map(result => [result.submissionId, result.submitterId, Number(result.fieldValue)]);
      await this.redis.set(key, JSON.stringify(tuples));
    }

    const resultIds = tuples.filter((_, i) => i >= skipCount && i < skipCount + takeCount).map(([id]) => id);
    return [await this.submissionService.findSubmissionByExistIds(resultIds), tuples.length];
  }

  // This function is called after a submission's updated, to determine which caches of statistics should be purged
  public async onSubmissionUpdated(oldSubmission: SubmissionEntity, submission: SubmissionEntity): Promise<void> {
    if (oldSubmission.status !== SubmissionStatus.Accepted && submission.status !== SubmissionStatus.Accepted) return;
    for (const statisticsType of Object.values(SubmissionStatisticsType)) {
      const { field, sort } = submissionStatisticsFields[statisticsType];
      const key = REDIS_KEY_SUBMISSION_STATISTICS + submission.problemId + "_" + statisticsType;
      const tuples = await this.getIdAndValuesFromRedis(key);

      if (!tuples || tuples.length === 0) continue;

      const isFirstBetter = (value: number, anotherValue: number) => {
        return (sort === "ASC" && value < anotherValue) || (sort === "DESC" && value > anotherValue);
      };

      const shouldCacheBePurged = () => {
        const oldSubmissionInList = tuples.some(([id]) => id === submission.id);

        // If the old value is in the list
        const oldValue = Number(oldSubmission[field]),
          newValue = Number(submission[field]);
        if (oldSubmissionInList) {
          return oldValue !== newValue || submission.status !== SubmissionStatus.Accepted;
        } else {
          if (submission.status !== SubmissionStatus.Accepted) return false;

          // If the new submission is Accepted, check if it's better than the submitter's best
          let submitterBestValue = tuples.find(
            ([submissionId, submitterId]) => submitterId === submission.submitterId
          )[2];
          if (submitterBestValue != null) {
            return isFirstBetter(newValue, submitterBestValue);
          }

          // If the new value is better than the last of the ranklist
          const [lastId, lastSubmitterId, lastValue] = tuples[tuples.length - 1];
          return isFirstBetter(newValue, lastValue);
        }
      };

      if (shouldCacheBePurged()) {
        Logger.log(
          `Purging submission statistics cache: problemId = ${submission.problemId}, statisticsType = ${statisticsType}`
        );
        await this.redis.del(key);
      }
    }
  }
}
