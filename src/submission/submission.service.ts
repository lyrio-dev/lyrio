import { Injectable, Logger, Inject, forwardRef } from "@nestjs/common";
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
import { JudgeTaskService } from "@/judge/judge-task-service.interface";
import { SubmissionProgress, SubmissionProgressType } from "./submission-progress.interface";
import { ProblemFileType } from "@/problem/problem-file.entity";
import { ProblemJudgeInfo } from "@/problem/problem-judge-info.interface";
import { SubmissionContent } from "./submission-content.interface";
import { SubmissionProgressService, SubmissionEventType } from "./submission-progress.service";
import { SubmissionBasicMetaDto } from "./dto";
import { SubmissionStatisticsService } from "./submission-statistics.service";
import { UserService } from "@/user/user.service";
import { ProblemSampleData } from "@/problem/problem-sample-data.interface";
import { RedisService } from "@/redis/redis.service";
import { JudgeGateway } from "@/judge/judge.gateway";
import { ProblemTypeFactoryService } from "@/problem-type/problem-type-factory.service";

interface SubmissionTaskExtraInfo extends JudgeTaskExtraInfo {
  problemType: ProblemType;
  judgeInfo: ProblemJudgeInfo;
  samples?: ProblemSampleData;
  testData: Record<string, string>; // filename -> uuid
  submissionContent: SubmissionContent;
}

@Injectable()
export class SubmissionService implements JudgeTaskService<SubmissionProgress, SubmissionTaskExtraInfo> {
  constructor(
    @InjectConnection()
    private connection: Connection,
    @InjectRepository(SubmissionEntity)
    private readonly submissionRepository: Repository<SubmissionEntity>,
    @InjectRepository(SubmissionDetailEntity)
    private readonly submissionDetailRepository: Repository<SubmissionDetailEntity>,
    private readonly problemService: ProblemService,
    private readonly problemTypeFactoryService: ProblemTypeFactoryService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly judgeQueueService: JudgeQueueService,
    private readonly redisService: RedisService,
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
      queryBuilderWithoutPagination.clone().andWhere("id < :smallestId", { smallestId: smallestId }).take(1).getCount(),
      queryBuilderWithoutPagination.clone().andWhere("id > :largestId", { largestId: largestId }).take(1).getCount()
    ]);

    return {
      result: result,
      hasSmallerId: !!hasSmallerId,
      hasLargerId: !!hasLargerId
    };
  }

  /**
   * @param problem Should be locked by `ProblemService.lockProblemById(id, "READ")`.
   */
  public async createSubmission(
    submitter: UserEntity,
    problem: ProblemEntity,
    content: SubmissionContent
  ): Promise<[errors: ValidationError[], submission: SubmissionEntity]> {
    const validationError = await this.problemTypeFactoryService.type(problem.type).validateSubmissionContent(content);
    if (validationError && validationError.length > 0) return [validationError, null];

    const submission = await this.connection.transaction("READ COMMITTED", async transactionalEntityManager => {
      const submission = new SubmissionEntity();
      submission.isPublic = problem.isPublic;
      const pair = await this.problemTypeFactoryService
        .type(problem.type)
        .getCodeLanguageAndAnswerSizeFromSubmissionContent(content);
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
      await this.judgeSubmission(submission);
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

    const result = [...new Array(days).keys()].map(i => map.get(startDate.clone().add(i, "day").valueOf()) || 0);

    return result;
  }

  /**
   * @param submission Must be locked (or just created, ID not exposed to user).
   */
  public async judgeSubmission(submission: SubmissionEntity): Promise<void> {
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

    await this.judgeQueueService.pushTask(
      submission.taskId,
      JudgeTaskType.Submission,
      JudgeTaskPriority.High,
      submission.id
    );

    await this.onSubmissionUpdated(oldSubmission, submission);
  }

  public async rejudgeSubmission(submission: SubmissionEntity): Promise<void> {
    await this.lockSubmission(submission, true, async submission => {
      if (!submission) return;
      this.judgeSubmission(submission);
    });
  }

  public async cancelSubmission(submission: SubmissionEntity): Promise<void> {
    const canceled = await this.lockSubmission(submission, true, async submission => {
      if (!submission || !submission.taskId) return false;

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

    await this.submissionProgressService.emitSubmissionEvent(submission.id, SubmissionEventType.Canceled);
  }

  public async setSubmissionPublic(submission: SubmissionEntity, isPublic: boolean): Promise<void> {
    submission.isPublic = isPublic;
    await this.submissionRepository.save(submission);
  }

  public async deleteSubmission(submission: SubmissionEntity): Promise<void> {
    // This function updates related info, lock the problem for READ first, then lock the submission
    await this.lockSubmission(submission, true, async submission => {
      if (!submission) return;

      if (submission.taskId) {
        this.judgeGateway.cancelTask(submission.taskId);
        await this.submissionProgressService.emitSubmissionEvent(submission.id, SubmissionEventType.Deleted);
      }

      await this.submissionRepository.remove(submission);
      await this.submissionStatisticsService.onSubmissionUpdated(submission, null);
      if (submission.status === SubmissionStatus.Accepted) {
        await this.problemService.updateProblemStatistics(submission.problemId, -1, -1);
        await this.userService.updateUserAcceptedCount(submission.submitterId, submission.problemId, "AC_TO_NON_AC");
      } else {
        await this.problemService.updateProblemStatistics(submission.problemId, -1, 0);
      }
    });
  }

  /**
   * This function updates related info, the problem must be locked for READ first, then the submission must be locked.
   */
  private async onSubmissionUpdated(oldSubmission: SubmissionEntity, submission: SubmissionEntity): Promise<void> {
    await this.submissionStatisticsService.onSubmissionUpdated(oldSubmission, submission);

    const oldAccepted = oldSubmission.status === SubmissionStatus.Accepted;
    const newAccepted = submission.status === SubmissionStatus.Accepted;
    if (!oldAccepted && newAccepted) {
      await this.problemService.updateProblemStatistics(submission.problemId, 0, 1);
      await this.userService.updateUserAcceptedCount(submission.submitterId, submission.problemId, "NON_AC_TO_AC");
    } else if (oldAccepted && !newAccepted) {
      await this.problemService.updateProblemStatistics(submission.problemId, 0, -1);
      await this.userService.updateUserAcceptedCount(submission.submitterId, submission.problemId, "AC_TO_NON_AC");
    }
  }

  /**
   * This function updates related info, the problem must be locked for READ first, then the submission must be locked.
   */
  private async onSubmissionFinished(
    submission: SubmissionEntity,
    problem: ProblemEntity,
    progress: SubmissionProgress
  ): Promise<void> {
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

    submission.taskId = null;
    submission.status = progress.status;
    submission.score = progress.score;

    const timeAndMemory = this.problemTypeFactoryService
      .type(problem.type)
      .getTimeAndMemoryUsedFromSubmissionResult(submissionDetail.result);
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

    const finished = progress.progressType === SubmissionProgressType.Finished;

    // Don't lock the problem if not finished since we don't modify the database.
    await this.lockSubmission(submission, finished, async (submission, problem?) => {
      if (!submission || submission.taskId !== taskId) {
        Logger.warn(`Invalid task Id ${taskId} of task progress, maybe there's a too-early rejudge?`);
        return false;
      }

      // First update database, then report progress
      if (finished) {
        await this.onSubmissionFinished(submission, problem, progress);
      }

      await this.submissionProgressService.emitSubmissionEvent(submission.id, SubmissionEventType.Progress, progress);
    });

    return true;
  }

  public async getTaskToBeSentToJudgeByTaskId(taskId: string): Promise<JudgeTask<SubmissionTaskExtraInfo>> {
    try {
      const submission = await this.findSubmissionByTaskId(taskId);
      if (!submission) return null;

      const submissionDetail = await this.getSubmissionDetail(submission);

      const problem = await this.problemService.findProblemById(submission.problemId);
      const judgeInfo = await this.problemService.getProblemJudgeInfo(problem);
      const testData = await this.problemService.getProblemFiles(problem, ProblemFileType.TestData);

      const preprocessedJudgeInfo = this.problemTypeFactoryService
        .type(problem.type)
        .preprocessJudgeInfo(judgeInfo, testData);

      return new JudgeTask<SubmissionTaskExtraInfo>(
        submission.taskId,
        JudgeTaskType.Submission,
        submission.id,
        JudgeTaskPriority.High,
        {
          problemType: problem.type,
          judgeInfo: preprocessedJudgeInfo,
          samples:
            preprocessedJudgeInfo && preprocessedJudgeInfo["runSamples"]
              ? await this.problemService.getProblemSamples(problem)
              : null,
          testData: Object.fromEntries(testData.map(problemFile => [problemFile.filename, problemFile.uuid])),
          submissionContent: submissionDetail.content
        }
      );
    } catch (e) {
      Logger.error(`Error in getTaskById("${taskId}"): ${e}`);
      return null;
    }
  }

  /**
   * Lock a submission and its problem (optionally). Ensure the submission's `taskId` is not changed and its problem exists.
   */
  async lockSubmission<T>(
    submission: SubmissionEntity,
    lockProblem: boolean,
    callback: (submission: SubmissionEntity, problem?: ProblemEntity) => Promise<T>
  ): Promise<T> {
    if (lockProblem) {
      return this.problemService.lockProblemById(submission.problemId, "READ", async problem => {
        if (!problem) return await callback(null);
        return this.redisService.lock(
          `Submission_${submission.id}`,
          async () => await callback(await this.findSubmissionById(submission.id), problem)
        );
      });
    } else {
      return this.redisService.lock(
        `Submission_${submission.id}`,
        async () => await callback(await this.findSubmissionById(submission.id))
      );
    }
  }

  async getUserProblemAcceptedSubmissionCount(userId: number, problemId: number): Promise<number> {
    return await this.submissionRepository.count({
      submitterId: userId,
      problemId: problemId,
      status: SubmissionStatus.Accepted
    });
  }

  async getUserLatestSubmissionByProblems(
    user: UserEntity,
    problems: ProblemEntity[],
    acceptedOnly?: boolean
  ): Promise<Map<number, SubmissionEntity>> {
    if (problems.length === 0) return new Map();

    const queryBuilder = this.submissionRepository
      .createQueryBuilder()
      .select("MAX(id)", "id")
      .where("submitterId = :submitterId", { submitterId: user.id })
      .andWhere("problemId IN (:...problemIds)", { problemIds: problems.map(problem => problem.id) })
      .groupBy("problemId");
    const queryResult: { id: string }[] = await (acceptedOnly
      ? queryBuilder.andWhere("status = :status", { status: SubmissionStatus.Accepted })
      : queryBuilder.andWhere("status != :status", { status: SubmissionStatus.Pending })
    ).getRawMany();
    const submissionIds = queryResult.map(result => parseInt(result.id));
    const submissions = await this.findSubmissionsByExistingIds(submissionIds);
    return new Map(submissions.map(submission => [submission.problemId, submission]));
  }

  async problemHasAnySubmission(problem: ProblemEntity): Promise<boolean> {
    return (
      (await this.submissionRepository.count({
        problemId: problem.id
      })) != 0
    );
  }

  /**
   * Cancel pending submissions when a problem is deleted.
   */
  async onDeleteProblem(problemId: number): Promise<void> {
    const pendingSubmissions = await this.submissionRepository
      .createQueryBuilder()
      .select()
      .where("problemId = :problemId", { problemId: problemId })
      .andWhere("taskId IS NOT NULL")
      .getMany();
    await Promise.all(
      pendingSubmissions.map(async submission => {
        this.judgeGateway.cancelTask(submission.taskId);
        await this.submissionProgressService.emitSubmissionEvent(submission.id, SubmissionEventType.Deleted);
      })
    );
  }

  /**
   * Do some cleanups AFTER a problem is deleted.
   */
  async onProblemDeleted(problemId: number): Promise<void> {
    await this.submissionStatisticsService.onProblemDeleted(problemId);
  }
}
