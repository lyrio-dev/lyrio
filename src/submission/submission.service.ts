import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { InjectRepository, InjectConnection } from "@nestjs/typeorm";

import { Repository, Connection, QueryBuilder } from "typeorm";
import { ValidationError } from "class-validator";
import { v4 as uuid } from "uuid";
import moment from "moment-timezone";

import { logger } from "@/logger";
import { ProblemPermissionType, ProblemService } from "@/problem/problem.service";
import { UserEntity } from "@/user/user.entity";
import { ProblemEntity, ProblemType } from "@/problem/problem.entity";
import {
  JudgeQueueService,
  JudgeTaskType,
  JudgeTaskPriorityType,
  JudgeTask,
  JudgeTaskExtraInfo
} from "@/judge/judge-queue.service";
import { JudgeTaskService } from "@/judge/judge-task-service.interface";
import { ProblemFileType } from "@/problem/problem-file.entity";
import { ProblemJudgeInfo } from "@/problem/problem-judge-info.interface";
import { UserService } from "@/user/user.service";
import { ProblemSampleData } from "@/problem/problem-sample-data.interface";
import { LockService } from "@/redis/lock.service";
import { JudgeGateway } from "@/judge/judge.gateway";
import { ProblemTypeFactoryService } from "@/problem-type/problem-type-factory.service";
import { AuditLogObjectType, AuditService } from "@/audit/audit.service";
import { AlternativeUrlFor, FileService } from "@/file/file.service";
import { ConfigService } from "@/config/config.service";
import { FileEntity } from "@/file/file.entity";
import { UserPrivilegeService, UserPrivilegeType } from "@/user/user-privilege.service";

import { SubmissionProgress, SubmissionProgressType } from "./submission-progress.interface";
import { SubmissionContent } from "./submission-content.interface";
import { SubmissionProgressService, SubmissionEventType } from "./submission-progress.service";
import { SubmissionStatisticsService } from "./submission-statistics.service";
import { SubmissionEntity } from "./submission.entity";
import { SubmissionDetailEntity } from "./submission-detail.entity";
import { SubmissionStatus } from "./submission-status.enum";

import { FileUploadInfoDto, SignedFileUploadRequestDto } from "@/file/dto";

import { SubmissionBasicMetaDto } from "./dto";

export enum SubmissionPermissionType {
  View = "View",
  Cancel = "Cancel",
  Rejudge = "Rejudge",
  ManagePublicness = "ManagePublicness",
  Delete = "Delete"
}

interface SubmissionTaskExtraInfo extends JudgeTaskExtraInfo {
  problemType: ProblemType;
  judgeInfo: ProblemJudgeInfo;
  samples?: ProblemSampleData;
  testData: Record<string, string>; // filename -> uuid
  submissionContent: SubmissionContent;
  file?: {
    uuid: string;
    url: string;
  };
}

function makeSubmissionPriority(
  id: number,
  userPendingCount: number,
  userOccupiedTimeRecently: number,
  avgEveryUsersOccupiedTimeRecently: number,
  stdEveryUsersOccupiedTimeRecently: number,
  priorityType: JudgeTaskPriorityType
): number {
  // For any `x` > 1, the larger `x` is, the smaller `1 / x` will be,
  // so the less `priority - (1 / x)` will increase the priority

  // Let `x` = `t_1` * `t_2` * `t_3` ....
  // For some `t_i` in [1, `n_i`], the smaller `n_i`, the more significantly it will influence `x`
  // Because, with the same `t_i`, increasing other `t_j`s will influence `x` less significantly

  // A submission by a user with more pending submissions will have much lower priority
  const t1 = userPendingCount + 1;
  // Multiple submissions, with the same number of pending submissions by their users will be compared by their IDs
  // We should make ID much larger and increase much slower to prevent it from influencing the priority more than pending count
  const t2 = id + 1000000;

  // The more time the user occupied recently, the lower the submission' priority will be
  // We assume the total time occupied by each user fits normal distribution
  // k: the user's occupied time = average + k * standard deviation
  const k = (userOccupiedTimeRecently - avgEveryUsersOccupiedTimeRecently) / stdEveryUsersOccupiedTimeRecently;

  // We map k ** 2 to a number in [1, 100] to have a more significant influence than ID but less than pending count
  const T3_MIN = 1;
  const T3_MAX = 100;
  const K_MIN = 1;
  const K_MAX = 3;
  let t3: number;
  // All time occupied recently is by this user means no other users are submitting, no need to decrease its priority
  if (Number.isNaN(k) || k < 1) t3 = T3_MIN;
  // If a user's occupied time > average + 3 * standard deviation, we decrease its priotity to the lowest
  else if (k > 3) t3 = T3_MAX;
  // If a user's occupied time > average + 1 * standard deviation, we start decreasing its priority
  else t3 = ((k ** 2 - K_MIN) / (K_MAX - K_MIN)) * (T3_MAX - T3_MIN) + T3_MIN;

  // So a larger `x` will lead to a lower priority as we use `priority - (1 / x)`
  const x = t1 * t2 * t3;

  return priorityType - 1 / x;
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
    private readonly lockService: LockService,
    private readonly submissionProgressService: SubmissionProgressService,
    private readonly submissionStatisticsService: SubmissionStatisticsService,
    private readonly judgeGateway: JudgeGateway,
    private readonly auditService: AuditService,
    private readonly fileService: FileService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => UserPrivilegeService))
    private readonly userPrivilegeService: UserPrivilegeService
  ) {
    this.judgeQueueService.registerTaskType(JudgeTaskType.Submission, this);

    this.auditService.registerObjectTypeQueryHandler(AuditLogObjectType.Submission, async submissionId => {
      const submission = await this.findSubmissionById(submissionId);
      return !submission ? null : await this.getSubmissionBasicMeta(submission);
    });
  }

  async findSubmissionById(submissionId: number): Promise<SubmissionEntity> {
    return await this.submissionRepository.findOne({
      id: submissionId
    });
  }

  async findSubmissionByTaskId(taskId: string): Promise<SubmissionEntity> {
    return await this.submissionRepository.findOne({
      taskId
    });
  }

  async findSubmissionsByExistingIds(submissionIds: number[]): Promise<SubmissionEntity[]> {
    if (submissionIds.length === 0) return [];
    const uniqueIds = Array.from(new Set(submissionIds));
    const records = await this.submissionRepository.findByIds(uniqueIds);
    const map = Object.fromEntries(records.map(record => [record.id, record]));
    return submissionIds.map(submissionId => map[submissionId]);
  }

  async userHasPermission(
    user: UserEntity,
    submission: SubmissionEntity,
    type: SubmissionPermissionType,
    problem?: ProblemEntity,
    hasPrivilege?: boolean
  ): Promise<boolean> {
    switch (type) {
      // Everyone can read a public submission
      // Submitter and those who has the Modify permission of the submission's problem can View a non-public submission
      case SubmissionPermissionType.View:
        if (submission.isPublic) return true;
        if (!user) return false;
        if (user.id === submission.submitterId) return true;
        return await this.problemService.userHasPermission(
          user,
          problem ?? (await this.problemService.findProblemById(submission.problemId)),
          ProblemPermissionType.Modify,
          hasPrivilege
        );

      // Submitter and those who has the Modify permission of the submission's problem can Cancel a submission
      case SubmissionPermissionType.Cancel:
        if (!user) return false;
        if (user.id === submission.submitterId) return true;
        return await this.problemService.userHasPermission(
          user,
          problem ?? (await this.problemService.findProblemById(submission.problemId)),
          ProblemPermissionType.Modify,
          hasPrivilege
        );

      // Those who has the Modify permission of the submission's problem can Rejudge a submission
      case SubmissionPermissionType.Rejudge:
        return await this.problemService.userHasPermission(
          user,
          problem ?? (await this.problemService.findProblemById(submission.problemId)),
          ProblemPermissionType.Modify,
          hasPrivilege
        );

      // Admins can manage a submission's publicness or delete a submission
      case SubmissionPermissionType.ManagePublicness:
      case SubmissionPermissionType.Delete:
        if (!user) return false;
        else if (user.isAdmin) return true;
        else if (
          hasPrivilege ??
          (await this.userPrivilegeService.userHasPrivilege(user, UserPrivilegeType.ManageProblem))
        )
          return true;
        else return false;

      default:
        return false;
    }
  }

  async querySubmissions(
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
        problemId
      });
    }

    if (submitterId) {
      queryBuilder.andWhere("submitterId = :submitterId", {
        submitterId
      });
    }

    if (codeLanguage) {
      queryBuilder.andWhere("codeLanguage = :codeLanguage", {
        codeLanguage
      });
    }

    if (status) {
      queryBuilder.andWhere("status = :status", {
        status
      });
    }

    const queryBuilderWithoutPagination = queryBuilder.clone();

    let reversed = false;
    if (minId != null) {
      queryBuilder.andWhere("id >= :minId", {
        minId
      });
      queryBuilder.orderBy("id", "ASC");
      reversed = true;
    } else if (maxId != null) {
      queryBuilder.andWhere("id <= :maxId", {
        maxId
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

    const largestId = result[0].id;
    const smallestId = result[result.length - 1].id;
    const [hasSmallerId, hasLargerId] = await Promise.all([
      queryBuilderWithoutPagination.clone().andWhere("id < :smallestId", { smallestId }).take(1).getCount(),
      queryBuilderWithoutPagination.clone().andWhere("id > :largestId", { largestId }).take(1).getCount()
    ]);

    return {
      result,
      hasSmallerId: !!hasSmallerId,
      hasLargerId: !!hasLargerId
    };
  }

  /**
   * @param problem Should be locked by `ProblemService.lockProblemById(id, "Read")`.
   */
  async createSubmission(
    submitter: UserEntity,
    problem: ProblemEntity,
    content: SubmissionContent,
    uploadInfo: FileUploadInfoDto
  ): Promise<
    [
      errors: ValidationError[],
      fileUploadErrorOrRequest:
        | "FILE_UUID_EXISTS"
        | "FILE_NOT_UPLOADED"
        | "FILE_TOO_LARGE"
        | SignedFileUploadRequestDto,
      submission: SubmissionEntity
    ]
  > {
    const problemTypeService = this.problemTypeFactoryService.type(problem.type);

    await new Promise(r => setTimeout(r, 10000));

    const validationError = await problemTypeService.validateSubmissionContent(content);
    if (validationError && validationError.length > 0) return [validationError, null, null];

    const [fileUploadErrorOrRequest, submission] = await this.connection.transaction<
      [
        fileUploadErrorOrRequest:
          | "FILE_UUID_EXISTS"
          | "FILE_NOT_UPLOADED"
          | "FILE_TOO_LARGE"
          | SignedFileUploadRequestDto,
        submission: SubmissionEntity
      ]
    >("READ COMMITTED", async transactionalEntityManager => {
      let file: FileEntity = null;
      if (problemTypeService.shouldUploadAnswerFile()) {
        const result = await this.fileService.processUploadRequest(
          uploadInfo,
          size => (size <= this.configService.config.resourceLimit.submissionFileSize ? null : "FILE_TOO_LARGE"),
          transactionalEntityManager
        );

        if (result instanceof FileEntity) file = result;
        else return [result, null];
      }

      // eslint-disable-next-line @typescript-eslint/no-shadow
      const submission = new SubmissionEntity();
      submission.isPublic = problem.isPublic;
      const pair = await problemTypeService.getCodeLanguageAndAnswerSizeFromSubmissionContentAndFile(content, file);
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
      submissionDetail.fileUuid = uploadInfo?.uuid;
      submissionDetail.result = null;
      await transactionalEntityManager.save(submissionDetail);

      return [null, submission];
    });

    if (submission) {
      await this.problemService.updateProblemStatistics(problem.id, 1, 0);
      await this.userService.updateUserSubmissionCount(submitter.id, 1);

      try {
        await this.judgeSubmission(submission);
      } catch (e) {
        logger.error(`Failed to start judge for submission ${submission.id}: ${e}`);
      }

      return [null, null, submission];
    }

    return [null, fileUploadErrorOrRequest, null];
  }

  async getSubmissionBasicMeta(submission: SubmissionEntity): Promise<SubmissionBasicMetaDto> {
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

  async getSubmissionDetail(submission: SubmissionEntity): Promise<SubmissionDetailEntity> {
    return await this.submissionDetailRepository.findOne({
      submissionId: submission.id
    });
  }

  async getUserRecentlySubmissionCountPerDay(
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

    const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const getConvertTimezoneExpression = (valueToBeConverted: string) =>
      timezone === localTimezone ? valueToBeConverted : `CONVERT_TZ(${valueToBeConverted}, :localTimezone, :timezone)`;
    const queryResult: { submitDate: Date; count: string }[] = await this.submissionRepository
      .createQueryBuilder()
      .select(`DATE(${getConvertTimezoneExpression("submitTime")})`, "submitDate")
      .addSelect("COUNT(*)", "count")
      .where("submitterId = :submitterId", { submitterId: user.id })
      .andWhere(`submitTime >= DATE_SUB(${getConvertTimezoneExpression(":now")}, INTERVAL :offsetDays DAY)`, {
        now,
        offsetDays: days - 1
      })
      .groupBy("submitDate")
      .setParameters({
        localTimezone,
        timezone
      })
      .getRawMany();

    // The database doesn't support timezone
    if (queryResult.length === 1 && queryResult[0].submitDate === null) return new Array(days).fill(0);

    const map = new Map(
      queryResult.map(row => [
        // Get the timestemp of result datetime
        // 1. Get the date string of result datetime
        // 2. Get the moment() object in requested timezone of the date
        // 3. Get its timestamp
        moment.tz(moment(row.submitDate).format("YYYY-MM-DD"), timezone).valueOf(),
        Number(row.count)
      ])
    );

    const result = [...new Array(days).keys()].map(i => map.get(startDate.clone().add(i, "day").valueOf()) || 0);

    return result;
  }

  /**
   * @param submission Must be locked (or just created, ID not exposed to user).
   */
  async judgeSubmission(submission: SubmissionEntity, isRejudge?: boolean): Promise<void> {
    const oldSubmission = { ...submission };

    if (submission.taskId) {
      this.judgeGateway.cancelTask(submission.taskId);
    }

    submission.taskId = uuid();
    submission.score = null;
    submission.status = SubmissionStatus.Pending;
    submission.timeUsed = null;
    submission.memoryUsed = null;
    await this.submissionRepository.save(submission);

    const [
      userPendingCount,
      userOccupiedTimeRecently,
      avgEveryUsersOccupiedTimeRecently,
      stdEveryUsersOccupiedTimeRecently
    ] = await (async () => {
      // For performance reasons, dynamic task priority could be disabled to reduce database stress
      if (!this.configService.config.preference.serverSideOnly.dynamicTaskPriority) return [0, 0, 0, 0];

      // If we are rejudging some submission, don't consider the user's influence to judge queue for priority
      if (isRejudge) return [0, 0, 0, 0];

      const selectTotalOccupiedTimeRecently = (qb: QueryBuilder<SubmissionEntity>) =>
        qb.select("SUM(totalOccupiedTime)", "total").andWhere("submitTime >= NOW() - INTERVAL 15 MINUTE");

      // eslint-disable-next-line @typescript-eslint/no-shadow
      const [userPendingCount, userOccupiedTimeRecently, avgAndStdEveryUsersOccupiedTimeRecently] = await Promise.all([
        // userPendingCount
        this.submissionRepository.count({
          status: SubmissionStatus.Pending,
          submitterId: submission.submitterId
        }),
        // userOccupiedTimeRecently
        selectTotalOccupiedTimeRecently(this.submissionRepository.createQueryBuilder())
          .where({
            submitterId: submission.submitterId
          })
          .getRawOne<{ total: number }>()
          .then(result => result.total),
        // avgAndStdEveryUsersOccupiedTimeRecently
        this.connection
          .createQueryBuilder()
          .select("AVG(total)", "avg")
          .addSelect("STD(total)", "std")
          .from(
            qb =>
              selectTotalOccupiedTimeRecently(qb.select().from(SubmissionEntity, "submission")).groupBy(
                "submission.submitterId"
              ),
            "totalResult"
          )
          .getRawOne<{ avg: number; std: number }>()
      ]);

      return [
        userPendingCount,
        userOccupiedTimeRecently,
        avgAndStdEveryUsersOccupiedTimeRecently.avg,
        avgAndStdEveryUsersOccupiedTimeRecently.std
      ];
    })();

    await this.judgeQueueService.pushTask(
      submission.taskId,
      JudgeTaskType.Submission,
      makeSubmissionPriority(
        submission.id,
        userPendingCount,
        userOccupiedTimeRecently,
        avgEveryUsersOccupiedTimeRecently,
        stdEveryUsersOccupiedTimeRecently,
        isRejudge ? JudgeTaskPriorityType.Medium : JudgeTaskPriorityType.High
      )
    );

    await this.onSubmissionUpdated(oldSubmission, submission);
  }

  async rejudgeSubmission(submission: SubmissionEntity): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    await this.lockSubmission(submission, true, async submission => {
      if (!submission) return;

      await this.judgeSubmission(submission, true);

      const submissionDetail = await this.getSubmissionDetail(submission);
      submissionDetail.result = null;
      await this.submissionDetailRepository.save(submissionDetail);
    });
  }

  async cancelSubmission(submission: SubmissionEntity): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    const canceled = await this.lockSubmission(submission, true, async submission => {
      if (!submission || !submission.taskId) return false;

      this.judgeGateway.cancelTask(submission.taskId);

      const oldSubmission = { ...submission };

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

  async setSubmissionPublic(submission: SubmissionEntity, isPublic: boolean): Promise<void> {
    submission.isPublic = isPublic;
    await this.submissionRepository.save(submission);
  }

  async deleteSubmission(submission: SubmissionEntity): Promise<void> {
    // This function updates related info, lock the problem for Read first, then lock the submission
    let deleteFileActually: () => void = null;
    // eslint-disable-next-line @typescript-eslint/no-shadow
    await this.lockSubmission(submission, true, async submission => {
      if (!submission) return;

      if (submission.taskId) {
        this.judgeGateway.cancelTask(submission.taskId);
        await this.submissionProgressService.emitSubmissionEvent(submission.id, SubmissionEventType.Deleted);
      }

      await this.connection.transaction("READ COMMITTED", async transactionalEntityManager => {
        const submissionDetail = await this.getSubmissionDetail(submission);
        if (submissionDetail.fileUuid)
          deleteFileActually = await this.fileService.deleteFile(submissionDetail.fileUuid, transactionalEntityManager);

        await transactionalEntityManager.remove(submission);
      });

      await this.submissionStatisticsService.onSubmissionUpdated(submission, null);
      if (submission.status === SubmissionStatus.Accepted) {
        await this.problemService.updateProblemStatistics(submission.problemId, -1, -1);
        await this.userService.updateUserAcceptedCount(submission.submitterId, submission.problemId, "AC_TO_NON_AC");
      } else {
        await this.problemService.updateProblemStatistics(submission.problemId, -1, 0);
      }
    });
    if (deleteFileActually) deleteFileActually();
  }

  /**
   * This function updates related info, the problem must be locked for Read first, then the submission must be locked.
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
   * This function updates related info, the problem must be locked for Read first, then the submission must be locked.
   */
  private async onSubmissionFinished(
    submission: SubmissionEntity,
    problem: ProblemEntity,
    progress: SubmissionProgress
  ): Promise<void> {
    const oldSubmission = { ...submission };

    const submissionDetail = await this.getSubmissionDetail(submission);
    submissionDetail.result = progress;

    submission.taskId = null;
    submission.status = progress.status;
    submission.score = progress.score;
    submission.totalOccupiedTime = progress.totalOccupiedTime;

    const timeAndMemory = this.problemTypeFactoryService
      .type(problem.type)
      .getTimeAndMemoryUsedFromFinishedSubmissionProgress(submissionDetail.result);
    submission.timeUsed = timeAndMemory.timeUsed;
    submission.memoryUsed = timeAndMemory.memoryUsed;

    await this.connection.transaction(async transactionalEntityManager => {
      await transactionalEntityManager.save(submission);
      await transactionalEntityManager.save(submissionDetail);
    });

    logger.log(`Submission ${submission.id} finished with status ${submission.status}`);

    await this.onSubmissionUpdated(oldSubmission, submission);
  }

  /**
   * @return `false` means the task is canceled.
   */
  async onTaskProgress(taskId: string, progress: SubmissionProgress): Promise<boolean> {
    const submission = await this.findSubmissionByTaskId(taskId);
    if (!submission) {
      logger.warn(`Invalid task Id ${taskId} of task progress, maybe there's a too-early rejudge?`);
      return false;
    }

    const finished = progress.progressType === SubmissionProgressType.Finished;

    // Don't lock the problem if not finished since we don't modify the database.
    // eslint-disable-next-line @typescript-eslint/no-shadow
    await this.lockSubmission(submission, finished, async (submission, problem?) => {
      if (!submission || submission.taskId !== taskId) {
        logger.warn(`Invalid task Id ${taskId} of task progress, maybe there's a too-early rejudge?`);
      }

      // First update database, then report progress
      if (finished) {
        await this.onSubmissionFinished(submission, problem, progress);
      }

      await this.submissionProgressService.emitSubmissionEvent(submission.id, SubmissionEventType.Progress, progress);
    });

    return true;
  }

  async getTaskToBeSentToJudgeByTaskId(taskId: string, priotity: number): Promise<JudgeTask<SubmissionTaskExtraInfo>> {
    try {
      const submission = await this.findSubmissionByTaskId(taskId);
      if (!submission) return null;

      const submissionDetail = await this.getSubmissionDetail(submission);

      const problem = await this.problemService.findProblemById(submission.problemId);
      const [preprocessedJudgeInfo] = await this.problemService.getProblemPreprocessedJudgeInfo(problem);
      const testData = await this.problemService.getProblemFiles(problem, ProblemFileType.TestData);

      const problemTypeService = this.problemTypeFactoryService.type(problem.type);

      return new JudgeTask<SubmissionTaskExtraInfo>(
        submission.taskId,
        JudgeTaskType.Submission,
        JudgeTaskPriorityType.High,
        priotity,
        {
          problemType: problem.type,
          judgeInfo: preprocessedJudgeInfo,
          samples:
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            preprocessedJudgeInfo && (preprocessedJudgeInfo as any).runSamples
              ? (await this.problemService.getProblemSamples(problem)).slice(
                  0,
                  this.configService.config.resourceLimit.problemSamplesToRun
                )
              : null,
          testData: Object.fromEntries(testData.map(problemFile => [problemFile.filename, problemFile.uuid])),
          submissionContent: submissionDetail.content,
          file: problemTypeService.shouldUploadAnswerFile()
            ? {
                uuid: submissionDetail.fileUuid,
                url: problemTypeService.shouldUploadAnswerFile()
                  ? await this.fileService.signDownloadLink({
                      uuid: submissionDetail.fileUuid,
                      downloadFilename: null,
                      noExpire: true,
                      useAlternativeEndpointFor: AlternativeUrlFor.Judge
                    })
                  : null
              }
            : null
        }
      );
    } catch (e) {
      logger.error(`Error in getTaskById("${taskId}"): ${e}`);
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
      return await this.problemService.lockProblemById(submission.problemId, "Read", async problem => {
        if (!problem) return await callback(null);
        return await this.lockService.lock(
          `Submission_${submission.id}`,
          async () => await callback(await this.findSubmissionById(submission.id), problem)
        );
      });
    }
    return await this.lockService.lock(
      `Submission_${submission.id}`,
      async () => await callback(await this.findSubmissionById(submission.id))
    );
  }

  async getUserProblemAcceptedSubmissionCount(userId: number, problemId: number): Promise<number> {
    return await this.submissionRepository.count({
      submitterId: userId,
      problemId,
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
    const submissionIds = queryResult.map(result => Number(result.id));
    const submissions = await this.findSubmissionsByExistingIds(submissionIds);
    return new Map(submissions.map(submission => [submission.problemId, submission]));
  }

  async problemHasAnySubmission(problem: ProblemEntity): Promise<boolean> {
    return (
      (await this.submissionRepository.count({
        problemId: problem.id
      })) !== 0
    );
  }

  /**
   * Cancel pending submissions when a problem is deleted.
   */
  async onDeleteProblem(problemId: number): Promise<void> {
    const pendingSubmissions = await this.submissionRepository
      .createQueryBuilder()
      .select()
      .where("problemId = :problemId", { problemId })
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
