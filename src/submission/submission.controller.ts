import { Controller, Post, Body, BadRequestException } from "@nestjs/common";
import { ApiOperation, ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "@/common/user.decorator";
import { UserEntity } from "@/user/user.entity";
import { SubmissionService } from "./submission.service";
import { SubmissionProgressGateway, SubmissionProgressSubscriptionType } from "./submission-progress.gateway";
import { SubmissionProgressService } from "./submission-progress.service";
import { ProblemService, ProblemPermissionType } from "@/problem/problem.service";
import { UserService } from "@/user/user.service";
import { UserPrivilegeService, UserPrivilegeType } from "@/user/user-privilege.service";
import { ConfigService } from "@/config/config.service";
import {
  SubmitRequestDto,
  SubmitResponseDto,
  SubmitResponseError,
  QuerySubmissionRequestDto,
  QuerySubmissionResponseDto,
  QuerySubmissionResponseError,
  SubmissionMetaDto,
  GetSubmissionDetailRequestDto,
  GetSubmissionDetailResponseDto,
  GetSubmissionDetailResponseError,
  QuerySubmissionStatisticsRequestDto,
  QuerySubmissionStatisticsResponseDto,
  QuerySubmissionStatisticsResponseError,
  RejudgeSubmissionRequestDto,
  RejudgeSubmissionResponseDto,
  RejudgeSubmissionResponseError,
  CancelSubmissionRequestDto,
  CancelSubmissionResponseDto,
  CancelSubmissionResponseError,
  SetSubmissionPublicRequestDto,
  SetSubmissionPublicResponseDto,
  SetSubmissionPublicResponseError,
  DeleteSubmissionRequestDto,
  DeleteSubmissionResponseDto,
  DeleteSubmissionResponseError
} from "./dto";
import { ProblemEntity } from "@/problem/problem.entity";
import { SubmissionStatus } from "./submission-status.enum";
import { SubmissionStatisticsService } from "./submission-statistics.service";

@ApiTags("Submission")
@Controller("submission")
export class SubmissionController {
  constructor(
    private readonly submissionService: SubmissionService,
    private readonly problemService: ProblemService,
    private readonly userService: UserService,
    private readonly userPrivilegeService: UserPrivilegeService,
    private readonly configService: ConfigService,
    private readonly submissionProgressGateway: SubmissionProgressGateway,
    private readonly submissionProgressService: SubmissionProgressService,
    private readonly submissionStatisticsService: SubmissionStatisticsService
  ) {}

  @ApiOperation({
    summary: "Submit code to a problem."
  })
  @ApiBearerAuth()
  @Post("submit")
  async submit(@CurrentUser() currentUser: UserEntity, @Body() request: SubmitRequestDto): Promise<SubmitResponseDto> {
    if (!currentUser)
      return {
        error: SubmitResponseError.PERMISSION_DENIED
      };

    return await this.problemService.lockProblemById<SubmitResponseDto>(request.problemId, "READ", async problem => {
      if (!problem)
        return {
          error: SubmitResponseError.NO_SUCH_PROBLEM
        };

      // TODO: add "submit" permission
      if (!(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.VIEW)))
        return {
          error: SubmitResponseError.PERMISSION_DENIED
        };

      const [validationError, submission] = await this.submissionService.createSubmission(
        currentUser,
        problem,
        request.content
      );

      if (validationError && validationError.length > 0) throw new BadRequestException(validationError);

      return {
        submissionId: submission.id
      };
    });
  }

  @ApiOperation({
    summary: "Query the submissions."
  })
  @ApiBearerAuth()
  @Post("querySubmission")
  async querySubmission(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: QuerySubmissionRequestDto
  ): Promise<QuerySubmissionResponseDto> {
    let filterProblem: ProblemEntity = null;
    if (request.problemId || request.problemDisplayId) {
      filterProblem = request.problemId
        ? await this.problemService.findProblemById(request.problemId)
        : await this.problemService.findProblemByDisplayId(request.problemDisplayId);
      if (!filterProblem)
        return {
          error: QuerySubmissionResponseError.NO_SUCH_PROBLEM
        };
    }

    let filterSubmitter: UserEntity = null;
    if (request.submitter) {
      filterSubmitter = await this.userService.findUserByUsername(request.submitter);
      if (!filterSubmitter)
        return {
          error: QuerySubmissionResponseError.NO_SUCH_USER
        };
    }

    const hasManageProblemPrivilege = await this.userPrivilegeService.userHasPrivilege(
      currentUser,
      UserPrivilegeType.MANAGE_PROBLEM
    );
    const hasViewProblemPermission =
      hasManageProblemPrivilege ||
      (filterProblem &&
        (await this.problemService.userHasPermission(currentUser, filterProblem, ProblemPermissionType.VIEW)));
    const isSubmissionsOwned = filterSubmitter && currentUser && filterSubmitter.id === currentUser.id;
    const queryResult = await this.submissionService.querySubmissions(
      filterProblem ? filterProblem.id : null,
      filterSubmitter ? filterSubmitter.id : null,
      request.codeLanguage,
      request.status,
      request.minId,
      request.maxId,
      !(hasManageProblemPrivilege || hasViewProblemPermission || isSubmissionsOwned),
      request.takeCount > this.configService.config.queryLimit.submissionsTake
        ? this.configService.config.queryLimit.submissionsTake
        : request.takeCount
    );

    const submissionMetas: SubmissionMetaDto[] = new Array(queryResult.result.length);
    const problems = await this.problemService.findProblemsByExistingIds(
      queryResult.result.map(submission => submission.problemId)
    );
    const submitters = await this.userService.findUsersByExistingIds(
      queryResult.result.map(submission => submission.submitterId)
    );
    const pendingSubmissionIds: number[] = [];
    for (const i in queryResult.result) {
      const submission = queryResult.result[i];
      const titleLocale = problems[i].locales.includes(request.locale) ? request.locale : problems[i].locales[0];

      submissionMetas[i] = {
        id: submission.id,
        isPublic: submission.isPublic,
        codeLanguage: submission.codeLanguage,
        answerSize: submission.answerSize,
        score: submission.score,
        status: submission.status,
        submitTime: submission.submitTime,
        problem: await this.problemService.getProblemMeta(problems[i]),
        problemTitle: await this.problemService.getProblemLocalizedTitle(problems[i], titleLocale),
        submitter: await this.userService.getUserMeta(submitters[i], currentUser),
        timeUsed: submission.timeUsed,
        memoryUsed: submission.memoryUsed
      };

      // For progress reporting
      const progress =
        submission.status === SubmissionStatus.Pending &&
        (await this.submissionProgressService.getSubmissionProgress(submission.id));

      if (progress) {
        submissionMetas[i].progressMeta = progress.progressType;
      }

      if (submission.status === SubmissionStatus.Pending) {
        pendingSubmissionIds.push(submission.id);
      }
    }

    return {
      submissions: submissionMetas,
      progressSubscriptionKey:
        pendingSubmissionIds.length === 0
          ? null
          : this.submissionProgressGateway.encodeSubscription({
              type: SubmissionProgressSubscriptionType.Meta,
              submissionIds: pendingSubmissionIds
            }),
      hasSmallerId: queryResult.hasSmallerId,
      hasLargerId: queryResult.hasLargerId
    };
  }

  @ApiOperation({
    summary: "Get the meta, content and result of a submission."
  })
  @ApiBearerAuth()
  @Post("getSubmissionDetail")
  async getSubmissionDetail(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: GetSubmissionDetailRequestDto
  ): Promise<GetSubmissionDetailResponseDto> {
    const submission = await this.submissionService.findSubmissionById(parseInt(request.submissionId));
    if (!submission)
      return {
        error: GetSubmissionDetailResponseError.NO_SUCH_SUBMISSION
      };

    const problem = await this.problemService.findProblemById(submission.problemId);
    if (!(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.VIEW)))
      return {
        error: GetSubmissionDetailResponseError.PERMISSION_DENIED
      };
    const submitter = await this.userService.findUserById(submission.submitterId);
    const submissionDetail = await this.submissionService.getSubmissionDetail(submission);

    const titleLocale = problem.locales.includes(request.locale) ? request.locale : problem.locales[0];

    const pending = submission.status === SubmissionStatus.Pending;
    const progress = !pending ? null : await this.submissionProgressService.getSubmissionProgress(submission.id);

    const hasPermission = await this.problemService.userHasPermission(
      currentUser,
      problem,
      ProblemPermissionType.MODIFY
    );

    return {
      meta: {
        id: submission.id,
        isPublic: submission.isPublic,
        codeLanguage: submission.codeLanguage,
        answerSize: submission.answerSize,
        score: submission.score,
        status: submission.status,
        submitTime: submission.submitTime,
        problem: await this.problemService.getProblemMeta(problem),
        problemTitle: await this.problemService.getProblemLocalizedTitle(problem, titleLocale),
        submitter: await this.userService.getUserMeta(submitter, currentUser),
        timeUsed: submission.timeUsed,
        memoryUsed: submission.memoryUsed
      },
      content: submissionDetail.content,
      result: submissionDetail.result,
      progress: progress,
      progressSubscriptionKey: !pending
        ? null
        : this.submissionProgressGateway.encodeSubscription({
            type: SubmissionProgressSubscriptionType.Detail,
            submissionIds: [submission.id]
          }),
      permissionRejudge: hasPermission,
      permissionCancel: hasPermission || (currentUser && submission.submitterId === currentUser.id),
      permissionSetPublic: hasPermission,
      permissionDelete: hasPermission
    };
  }

  @ApiOperation({
    summary: "Query a problem's submission statistics, i.e. the ranklist of each user's best submissions"
  })
  @ApiBearerAuth()
  @Post("querySubmissionStatistics")
  async querySubmissionStatistics(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: QuerySubmissionStatisticsRequestDto
  ): Promise<QuerySubmissionStatisticsResponseDto> {
    if (request.takeCount > this.configService.config.queryLimit.submissionStatisticsTake)
      return {
        error: QuerySubmissionStatisticsResponseError.TAKE_TOO_MANY
      };

    let problem: ProblemEntity;
    if (request.problemId) problem = await this.problemService.findProblemById(request.problemId);
    if (request.problemDisplayId) problem = await this.problemService.findProblemByDisplayId(request.problemDisplayId);
    if (!problem)
      return {
        error: QuerySubmissionStatisticsResponseError.NO_SUCH_PROBLEM
      };

    if (!(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.VIEW)))
      return {
        error: QuerySubmissionStatisticsResponseError.PERMISSION_DENIED
      };

    const [submissions, count] = await this.submissionStatisticsService.querySubmissionStatisticsAndCount(
      problem,
      request.statisticsType,
      request.skipCount,
      request.takeCount
    );

    const submissionMetas: SubmissionMetaDto[] = new Array(submissions.length);
    const titleLocale = problem.locales.includes(request.locale) ? request.locale : problem.locales[0];
    const problemTitle = await this.problemService.getProblemLocalizedTitle(problem, titleLocale);
    const submitters = await this.userService.findUsersByExistingIds(
      submissions.map(submission => submission.submitterId)
    );
    for (const i in submissions) {
      const submission = submissions[i];

      submissionMetas[i] = {
        id: submission.id,
        isPublic: submission.isPublic,
        codeLanguage: submission.codeLanguage,
        answerSize: submission.answerSize,
        score: submission.score,
        status: submission.status,
        submitTime: submission.submitTime,
        problem: await this.problemService.getProblemMeta(problem),
        problemTitle: problemTitle,
        submitter: await this.userService.getUserMeta(submitters[i], currentUser),
        timeUsed: submission.timeUsed,
        memoryUsed: submission.memoryUsed
      };
    }

    return {
      submissions: submissionMetas,
      scores: await this.submissionStatisticsService.querySubmissionScoreStatistics(problem),
      count: count
    };
  }

  @ApiOperation({
    summary: "Rejudge a submission."
  })
  @ApiBearerAuth()
  @Post("rejudgeSubmission")
  async rejudgeSubmission(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: RejudgeSubmissionRequestDto
  ): Promise<RejudgeSubmissionResponseDto> {
    if (!currentUser)
      return {
        error: RejudgeSubmissionResponseError.PERMISSION_DENIED
      };

    const submission = await this.submissionService.findSubmissionById(request.submissionId);
    if (!submission)
      return {
        error: RejudgeSubmissionResponseError.NO_SUCH_SUBMISSION
      };

    const problem = await this.problemService.findProblemById(submission.problemId);

    if (!(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.MODIFY)))
      return {
        error: RejudgeSubmissionResponseError.PERMISSION_DENIED
      };

    await this.submissionService.rejudgeSubmission(submission);

    return {};
  }

  @ApiOperation({
    summary:
      "Cancel a submission if it is running. Cancel a non-running submission will result in not error and no effect."
  })
  @ApiBearerAuth()
  @Post("cancelSubmission")
  async cancelSubmission(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: CancelSubmissionRequestDto
  ): Promise<CancelSubmissionResponseDto> {
    if (!currentUser)
      return {
        error: CancelSubmissionResponseError.PERMISSION_DENIED
      };

    const submission = await this.submissionService.findSubmissionById(request.submissionId);
    if (!submission)
      return {
        error: CancelSubmissionResponseError.NO_SUCH_SUBMISSION
      };

    if (submission.submitterId !== currentUser.id) {
      const problem = await this.problemService.findProblemById(submission.problemId);

      if (!(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.MODIFY)))
        return {
          error: CancelSubmissionResponseError.PERMISSION_DENIED
        };
    }

    await this.submissionService.cancelSubmission(submission);

    return {};
  }

  @ApiOperation({
    summary: "Set if a submission is public or not."
  })
  @ApiBearerAuth()
  @Post("setSubmissionPublic")
  async setSubmissionPublic(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: SetSubmissionPublicRequestDto
  ): Promise<SetSubmissionPublicResponseDto> {
    if (!currentUser)
      return {
        error: SetSubmissionPublicResponseError.PERMISSION_DENIED
      };

    const submission = await this.submissionService.findSubmissionById(request.submissionId);
    if (!submission)
      return {
        error: SetSubmissionPublicResponseError.NO_SUCH_SUBMISSION
      };

    const problem = await this.problemService.findProblemById(submission.problemId);

    if (!(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.MODIFY)))
      return {
        error: SetSubmissionPublicResponseError.PERMISSION_DENIED
      };

    await this.submissionService.setSubmissionPublic(submission, request.isPublic);

    return {};
  }

  @ApiOperation({
    summary: "Delete a submission."
  })
  @ApiBearerAuth()
  @Post("deleteSubmission")
  async deleteSubmission(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: DeleteSubmissionRequestDto
  ): Promise<DeleteSubmissionResponseDto> {
    if (!currentUser)
      return {
        error: DeleteSubmissionResponseError.PERMISSION_DENIED
      };

    const submission = await this.submissionService.findSubmissionById(request.submissionId);
    if (!submission)
      return {
        error: DeleteSubmissionResponseError.NO_SUCH_SUBMISSION
      };

    const problem = await this.problemService.findProblemById(submission.problemId);

    if (!(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.MODIFY)))
      return {
        error: DeleteSubmissionResponseError.PERMISSION_DENIED
      };

    await this.submissionService.deleteSubmission(submission);

    return {};
  }
}
