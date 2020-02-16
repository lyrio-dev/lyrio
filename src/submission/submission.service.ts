import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository, InjectConnection } from "@nestjs/typeorm";
import { Repository, Connection } from "typeorm";
import { ValidationError } from "class-validator";

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

interface SubmissionTaskExtraInfo extends JudgeTaskExtraInfo {
  problemType: ProblemType;
  judgeInfo: ProblemJudgeInfo;
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
    private readonly judgeQueueService: JudgeQueueService,
    private readonly submissionTypedService: SubmissionTypedService
  ) {
    this.judgeQueueService.registerTaskType(JudgeTaskType.Submission, this);
  }

  public async findSubmissionById(submissionId: number): Promise<SubmissionEntity> {
    return await this.submissionRepository.findOne({
      id: submissionId
    });
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

      await this.problemService.updateProblemStatistics(problem, 1, 0, transactionalEntityManager);

      return submission;
    });

    try {
      const judgeInfo = await this.problemService.getProblemJudgeInfo(problem);
      const testData = await this.problemService.listProblemFiles(problem, ProblemFileType.TestData, false);

      await this.judgeQueueService.pushTask(
        new JudgeTask<SubmissionTaskExtraInfo>(submission.id, JudgeTaskType.Submission, JudgeTaskPriority.High, {
          problemType: problem.type,
          judgeInfo: judgeInfo,
          testData: Object.fromEntries(testData.map(problemFile => [problemFile.filename, problemFile.uuid])),
          submissionContent: content
        })
      );
    } catch (e) {
      Logger.error(`Failed to start judge for submission ${submission.id}: ${e}`);
    }

    return [null, submission];
  }

  public async getSubmissionDetail(submission: SubmissionEntity): Promise<SubmissionDetailEntity> {
    return this.submissionDetailRepository.findOne({
      submissionId: submission.id
    });
  }

  private async onSubmissionFinished(submissionId: number, progress: SubmissionProgress): Promise<void> {
    const submission = await this.findSubmissionById(submissionId);
    if (!submission) {
      Logger.warn(`Invalid submission Id ${submissionId} of task progress, ignoring`);
      return;
    }

    const submissionDetail = await this.getSubmissionDetail(submission);
    submissionDetail.result = {
      systemMessage: progress.systemMessage,
      compile: progress.compile,
      testcaseResult: progress.testcaseResult,
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

    await this.connection.transaction(async transactionalEntityManager => {
      await transactionalEntityManager.save(submission);
      await transactionalEntityManager.save(submissionDetail);
    });

    Logger.log(`Submission ${submissionId} finished with status ${submission.status}`);
  }

  public async onTaskProgress(submissionId: number, progress: SubmissionProgress): Promise<void> {
    switch (progress.progressType) {
      case SubmissionProgressType.Preparing:
        // TODO: Report progress to user
        break;
      case SubmissionProgressType.Compiling:
        // TODO: Report progress to user
        break;
      case SubmissionProgressType.Running:
        // TODO: Report progress to user
        break;
      case SubmissionProgressType.Finished:
        // TODO: Report progress to user
        await this.onSubmissionFinished(submissionId, progress);
        break;
    }
  }

  // We need problem type
  // TODO: cache
  public async getSubmissionsTimeAndMemoryUsed(
    submissions: SubmissionEntity[],
    problems: ProblemEntity[]
  ): Promise<{ timeUsed: number; memoryUsed: number }[]> {
    const submissionDetails = await this.submissionDetailRepository.findByIds(
      submissions.map(submission => submission.id)
    );
    const submissionDetailMap: Record<number, SubmissionDetailEntity> = Object.fromEntries(
      submissionDetails.map(submissionDetail => [submissionDetail.submissionId, submissionDetail])
    );

    const result: { timeUsed: number; memoryUsed: number }[] = new Array(submissions.length);
    for (const i in submissions) {
      const submission = submissions[i];
      result[i] = await this.submissionTypedService.getTimeAndMemoryUsedFromSubmissionResult(
        problems[i].type,
        submissionDetailMap[submission.id].result
      );
    }
    return result;
  }
}
