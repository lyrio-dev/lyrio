import { Injectable, Logger, Ip } from "@nestjs/common";
import { InjectRepository, InjectConnection } from "@nestjs/typeorm";
import { Repository, Connection } from "typeorm";
import { ValidationError } from "class-validator";
import moment = require("moment-timezone");
import { v4 as uuid } from "uuid";

import { SubmissionEntity } from "./submission.entity";
import { SubmissionDetailEntity } from "./submission-detail.entity";
import { ProblemService } from "@/problem/problem.service";
import { UserEntity } from "@/user/user.entity";
import { ProblemEntity, ProblemType } from "@/problem/problem.entity";
import { SubmissionStatus } from "./submission-status.enum";
import {
  JudgeQueueService,
  JudgeTaskType,
  JudgeTaskPriority,
  JudgeTask,
  JudgeTaskExtraInfo
} from "@/judge/judge-queue.service";
import { JudgeTaskProgressReceiver } from "@/judge/judge-task-progress-receiver.interface";
import { SubmissionProgress, SubmissionProgressType } from "./submission-progress.interface";
import { ProblemFileType } from "@/problem/problem-file.entity";
import { ProblemJudgeInfo } from "@/problem/type/problem-judge-info.interface";
import { SubmissionContent } from "./submission-content.interface";
import { SubmissionTypedService } from "./type/submission-typed.service";
import { SubmissionProgressService } from "./submission-progress.service";
import { SubmissionBasicMetaDto } from "./dto";
import { SubmissionStatisticsService } from "./submission-statistics.service";
import { UserService } from "@/user/user.service";
import { ProblemSampleData } from "@/problem/problem-sample-data.interface";
import { RedisService } from "@/redis/redis.service";
import { JudgeGateway } from "@/judge/judge.gateway";

interface SubmissionTaskExtraInfo extends JudgeTaskExtraInfo {
  problemType: ProblemType;
  judgeInfo: ProblemJudgeInfo;
  samples?: ProblemSampleData;
  testData: Record<string, string>; // filename -> uuid
  submissionContent: SubmissionContent;
}

@Injectable()
export class SubmissionService implements JudgeTaskProgressReceiver<SubmissionProgress> {
  constructor(
    @InjectConnection()
    private connection: Connection,
    @InjectRepository(SubmissionEntity)
    private readonly submissionRepository: Repository<SubmissionEntity>,
    @InjectRepository(SubmissionDetailEntity)
    private readonly submissionDetailRepository: Repository<SubmissionDetailEntity>,
    private readonly problemService: ProblemService,
    private readonly userService: UserService,
    private readonly judgeQueueService: JudgeQueueService,
    private readonly redisService: RedisService,
    private readonly submissionTypedService: SubmissionTypedService,
    private readonly submissionProgressService: SubmissionProgressService,
    private readonly submissionStatisticsService: SubmissionStatisticsService,
    private readonly judgeGateway: JudgeGateway
  ) {
    this.judgeQueueService.registerTaskType(JudgeTaskType.Submission, this);
  }

  public async findSubmissionById(submissionId: number): Promise<SubmissionEntity> {
    return await this.submissionRepository.findOne({
      id: submissionId
    });
  }

  public async findSubmissionByTaskId(taskId: string): Promise<SubmissionEntity> {
    return await this.submissionRepository.findOne({
      taskId: taskId
    });
  }

  public async findSubmissionsByExistingIds(submissionIds: number[]): Promise<SubmissionEntity[]> {
    if (submissionIds.length === 0) return [];
    const uniqueIds = Array.from(new Set(submissionIds));
    const records = await this.submissionRepository.findByIds(uniqueIds);
    const map = Object.fromEntries(records.map(record => [record.id, record]));
    return submissionIds.map(submissionId => map[submissionId]);
  }

  public async querySubmissions(
    problemId: number,
    submitterId: number,
    codeLanguage: string,
    status: SubmissionStatus,
    minId: number,
    maxId: number,
    publicOnly: boolean,
    takeCount: number
  ): Promise<{ result: SubmissionEntity[]; hasSmallerId: boolean; hasLargerId: boolean }> {
    const queryBuilder = this.submissionRepository.createQueryBuilder();

    if (publicOnly) {
      queryBuilder.andWhere("isPublic = :isPublic", {
        isPublic: true
      });
    }

    if (problemId) {
      queryBuilder.andWhere("problemId = :problemId", {
        problemId: problemId
      });
    }

    if (submitterId) {
      queryBuilder.andWhere("submitterId = :submitterId", {
        submitterId: submitterId
      });
    }

    if (codeLanguage) {
      queryBuilder.andWhere("codeLanguage = :codeLanguage", {
        codeLanguage: codeLanguage
      });
    }

    if (status) {
      queryBuilder.andWhere("status = :status", {
        status: status
      });
    }

    const queryBuilderWithoutPagination = queryBuilder.clone();

    let reversed = false;
    if (minId != null) {
      queryBuilder.andWhere("id >= :minId", {
        minId: minId
      });
      queryBuilder.orderBy("id", "ASC");
      reversed = true;
    } else if (maxId != null) {
      queryBuilder.andWhere("id <= :maxId", {
        maxId: maxId
      });
      queryBuilder.orderBy("id", "DESC");
    } else {
      queryBuilder.orderBy("id", "DESC");
    }

    queryBuilder.take(takeCount);

    const result = await queryBuilder.getMany();
    if (reversed) result.reverse();

    if (result.length === 0)
      return {
        result: [],
        hasSmallerId: false,
        hasLargerId: false
      };

    const largestId = result[0].id,
      smallestId = result[result.length - 1].id;
    const [hasSmallerId, hasLargerId] = await Promise.all([
      queryBuilderWithoutPagination
        .clone()
        .andWhere("id < :smallestId", { smallestId: smallestId })
        .take(1)
        .getCount(),
      queryBuilderWithoutPagination
        .clone()
        .andWhere("id > :largestId", { largestId: largestId })
        .take(1)
        .getCount()
    ]);

    return {
      result: result,
      hasSmallerId: !!hasSmallerId,
      hasLargerId: !!hasLargerId
    };
  }

  public async createSubmission(
    submitter: UserEntity,
    problem: ProblemEntity,
    content: SubmissionContent
  ): Promise<[ValidationError[], SubmissionEntity]> {
    const validationError = await this.submissionTypedService.validateSubmissionContent(problem.type, content);
    if (validationError && validationError.length > 0) return [validationError, null];

    const submission = await this.connection.transaction("READ COMMITTED", async transactionalEntityManager => {
      const submission = new SubmissionEntity();
      submission.isPublic = problem.isPublic;
      const pair = await this.submissionTypedService.getCodeLanguageAndAnswerSizeFromSubmissionContent(
        problem.type,
        content
      );
      submission.codeLanguage = pair.language;
      submission.answerSize = pair.answerSize;
      submission.score = null;
      submission.status = SubmissionStatus.Pending;
      submission.submitTime = new Date();
      submission.problemId = problem.id;
      submission.submitterId = submitter.id;
      await transactionalEntityManager.save(submission);

      const submissionDetail = new SubmissionDetailEntity();
      submissionDetail.submissionId = submission.id;
      submissionDetail.content = content;
      submissionDetail.result = null;
      await transactionalEntityManager.save(submissionDetail);

      return submission;
    });

    await this.problemService.updateProblemStatistics(problem.id, 1, 0);
    await this.userService.updateUserSubmissionCount(submitter.id, 1);

    try {
      await this.judgeSubmission(submission, problem);
    } catch (e) {
      Logger.error(`Failed to start judge for submission ${submission.id}: ${e}`);
    }

    return [null, submission];
  }

  public async getSubmissionBasicMeta(submission: SubmissionEntity): Promise<SubmissionBasicMetaDto> {
    return {
      id: submission.id,
      isPublic: submission.isPublic,
      codeLanguage: submission.codeLanguage,
      answerSize: submission.answerSize,
      score: submission.score,
      status: submission.status,
      submitTime: submission.submitTime,
      timeUsed: submission.timeUsed,
      memoryUsed: submission.memoryUsed
    };
  }

  public async getSubmissionDetail(submission: SubmissionEntity): Promise<SubmissionDetailEntity> {
    return this.submissionDetailRepository.findOne({
      submissionId: submission.id
    });
  }

  public async getUserRecentlySubmissionCountPerDay(
    user: UserEntity,
    days: number,
    timezone: string,
    now: string
  ): Promise<number[]> {
    if (!moment.tz.zone(timezone)) timezone = "UTC";

    const startDate = moment(now)
      .tz(timezone)
      .startOf("day")
      .subtract(days - 1, "day");

    const queryResult: { submitDate: Date; count: string }[] = await this.submissionRepository
      .createQueryBuilder()
      .select('DATE(CONVERT_TZ(submitTime, "UTC", :timezone))', "submitDate")
      .addSelect("COUNT(*)", "count")
      .where("submitterId = :submitterId", { submitterId: user.id })
      .andWhere('submitTime >= DATE_SUB(CONVERT_TZ(:now, "UTC", :timezone), INTERVAL :offsetDays DAY)', {
        now: now,
        offsetDays: days - 1
      })
      .groupBy("submitDate")
      .setParameter("timezone", timezone)
      .getRawMany();

    // The database doesn't support timezone
    if (queryResult.length === 1 && queryResult[0].submitDate === null) return new Array(days).fill(0);

    const map = new Map(
      queryResult.map(row => [
        moment.tz(row.submitDate.toISOString().substr(0, 10), timezone).valueOf(),
        Number(row.count)
      ])
    );

    const result = [...new Array(days).keys()].map(
      i =>
        map.get(
          startDate
            .clone()
            .add(i, "day")
            .valueOf()
        ) || 0
    );

    return result;
  }

  public async judgeSubmission(submission: SubmissionEntity, problem: ProblemEntity): Promise<void> {
    const submissionId = submission.id;
    await this.lockSubmission(submissionId, async () => {
      const submission = await this.findSubmissionById(submissionId);

      const oldSubmission = Object.assign({}, submission);

      if (submission.taskId) {
        this.judgeGateway.cancelTask(submission.taskId);
      }

      submission.taskId = uuid();
      submission.score = null;
      submission.status = SubmissionStatus.Pending;
      submission.timeUsed = null;
      submission.memoryUsed = null;
      await this.submissionRepository.save(submission);

      const submissionDetail = await this.getSubmissionDetail(submission);

      const judgeInfo = await this.problemService.getProblemJudgeInfo(problem);
      const testData = await this.problemService.listProblemFiles(problem, ProblemFileType.TestData, false);
      await this.judgeQueueService.pushTask(
        new JudgeTask<SubmissionTaskExtraInfo>(
          submission.taskId,
          JudgeTaskType.Submission,
          submission.id,
          JudgeTaskPriority.High,
          {
            problemType: problem.type,
            judgeInfo: judgeInfo,
            samples: judgeInfo && judgeInfo["runSamples"] ? await this.problemService.getProblemSamples(problem) : null,
            testData: Object.fromEntries(testData.map(problemFile => [problemFile.filename, problemFile.uuid])),
            submissionContent: submissionDetail.content
          }
        )
      );

      await this.onSubmissionUpdated(oldSubmission, submission);
    });
  }

  public async cancelSubmission(submission: SubmissionEntity): Promise<void> {
    const submissionId = submission.id;
    const canceled = await this.lockSubmission(submissionId, async () => {
      const submission = await this.findSubmissionById(submissionId);

      if (!submission.taskId) return false;

      this.judgeGateway.cancelTask(submission.taskId);

      const oldSubmission = Object.assign({}, submission);

      submission.taskId = null;
      submission.score = null;
      submission.status = SubmissionStatus.Canceled;
      submission.timeUsed = null;
      submission.memoryUsed = null;

      const submissionDetail = await this.getSubmissionDetail(submission);
      submissionDetail.result = null;

      await this.connection.transaction("READ COMMITTED", async transactionalEntityManager => {
        await transactionalEntityManager.save(submission);
        await transactionalEntityManager.save(submissionDetail);
      });

      await this.onSubmissionUpdated(oldSubmission, submission);

      return true;
    });

    if (!canceled) return;

    await this.submissionProgressService.onSubmissionProgressReported(submissionId, true);
  }

  private async onSubmissionUpdated(oldSubmission: SubmissionEntity, submission: SubmissionEntity): Promise<void> {
    await this.submissionStatisticsService.onSubmissionUpdated(oldSubmission, submission);

    const oldAccepted = oldSubmission.status === SubmissionStatus.Accepted;
    const newAccepted = submission.status === SubmissionStatus.Accepted;
    if (!oldAccepted && newAccepted) {
      await this.problemService.updateProblemStatistics(submission.problemId, 0, 1);
    } else if (oldAccepted && !newAccepted) {
      await this.problemService.updateProblemStatistics(submission.problemId, 0, -1);
    }

    if (oldAccepted != newAccepted) {
      await this.userService.updateUserAcceptedCount(submission.submitterId);
    }
  }

  private async onSubmissionFinished(submission: SubmissionEntity, progress: SubmissionProgress): Promise<void> {
    const oldSubmission = Object.assign({}, submission);

    const submissionDetail = await this.getSubmissionDetail(submission);
    submissionDetail.result = {
      systemMessage: progress.systemMessage,
      compile: progress.compile,
      testcaseResult: progress.testcaseResult,
      samples: progress.samples && progress.samples.map(sample => sample.testcaseHash),
      subtasks:
        progress.subtasks &&
        progress.subtasks.map(subtask => ({
          score: subtask.score,
          fullScore: subtask.fullScore,
          testcases: subtask.testcases.map(testcase => testcase.testcaseHash)
        }))
    };

    submission.status = progress.status;
    submission.score = progress.score;

    const problem = await this.problemService.findProblemById(submission.problemId);
    const timeAndMemory = await this.submissionTypedService.getTimeAndMemoryUsedFromSubmissionResult(
      problem.type,
      submissionDetail.result
    );
    submission.timeUsed = timeAndMemory.timeUsed;
    submission.memoryUsed = timeAndMemory.memoryUsed;

    await this.connection.transaction(async transactionalEntityManager => {
      await transactionalEntityManager.save(submission);
      await transactionalEntityManager.save(submissionDetail);
    });

    Logger.log(`Submission ${submission.id} finished with status ${submission.status}`);

    await this.onSubmissionUpdated(oldSubmission, submission);
  }

  /**
   * @return `false` means the task is canceled.
   */
  public async onTaskProgress(taskId: string, progress: SubmissionProgress): Promise<boolean> {
    const submission = await this.findSubmissionByTaskId(taskId);
    if (!submission) {
      Logger.warn(`Invalid task Id ${taskId} of task progress, maybe there's a too-early rejudge?`);
      return false;
    }

    const submissionId = submission.id;
    await this.lockSubmission(submissionId, async () => {
      const submission = await this.findSubmissionById(submissionId);
      if (submission.taskId !== taskId) {
        Logger.warn(`Invalid task Id ${taskId} of task progress, maybe there's a too-early rejudge?`);
        return false;
      }

      // First update database, then report progress
      if (progress.progressType === SubmissionProgressType.Finished) {
        await this.onSubmissionFinished(submission, progress);
      }

      await this.submissionProgressService.onSubmissionProgressReported(submission.id, false, progress);
    });

    return true;
  }

  async lockSubmission<T>(submissionId: number, callback: () => Promise<T>): Promise<T> {
    return this.redisService.lock(`Submission_${submissionId}`, callback);
  }
}
