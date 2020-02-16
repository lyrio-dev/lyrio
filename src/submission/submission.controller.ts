import { Controller, Post, Body, BadRequestException } from "@nestjs/common";
import { ApiOperation, ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "@/common/user.decorator";
import { UserEntity } from "@/user/user.entity";
import { SubmissionService } from "./submission.service";
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
  GetSubmissionDetailResponseError
} from "./dto";
import { ProblemEntity } from "@/problem/problem.entity";

@ApiTags("Submission")
@Controller("submission")
export class SubmissionController {
  constructor(
    private readonly submissionService: SubmissionService,
    private readonly problemService: ProblemService,
    private readonly userService: UserService,
    private readonly userPrivilegeService: UserPrivilegeService,
    private readonly configService: ConfigService
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

    const problem = await this.problemService.findProblemById(request.problemId);
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

    const queryResult = await this.submissionService.querySubmissions(
      filterProblem ? filterProblem.id : null,
      filterSubmitter ? filterSubmitter.id : null,
      request.codeLanguage,
      request.status,
      request.minId,
      request.maxId,
      !(await this.userPrivilegeService.userHasPrivilege(currentUser, UserPrivilegeType.MANAGE_PROBLEM)),
      request.takeCount > this.configService.config.queryLimit.submissionsTake
        ? this.configService.config.queryLimit.submissionsTake
        : request.takeCount
    );

    const submissionMetas: SubmissionMetaDto[] = new Array(queryResult.result.length);
    const problems: ProblemEntity[] = new Array(queryResult.result.length);
    for (const i in queryResult.result) {
      const submission = queryResult.result[i];
      problems[i] =
        filterProblem && submission.problemId === filterProblem.id
          ? filterProblem
          : await this.problemService.findProblemById(submission.problemId);
      const titleLocale = problems[i].locales.includes(request.locale) ? request.locale : problems[i].locales[0];
      const submitter =
        filterSubmitter && submission.submitterId === filterSubmitter.id
          ? filterSubmitter
          : await this.userService.findUserById(submission.submitterId);
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
        submitter: await this.userService.getUserMeta(submitter),
        timeUsed: null,
        memoryUsed: null
      };
    }

    const timeAndMemoryUseds = await this.submissionService.getSubmissionsTimeAndMemoryUsed(
      queryResult.result,
      problems
    );
    for (const i in submissionMetas) {
      submissionMetas[i].timeUsed = timeAndMemoryUseds[i].timeUsed;
      submissionMetas[i].memoryUsed = timeAndMemoryUseds[i].memoryUsed;
    }

    return {
      submissions: submissionMetas,
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
    if (
      !submission.isPublic &&
      !(await this.problemService.userHasPermission(currentUser, problem, ProblemPermissionType.VIEW))
    )
      return {
        error: GetSubmissionDetailResponseError.PERMISSION_DENIED
      };
    const submitter = await this.userService.findUserById(submission.submitterId);
    const submissionDetail = await this.submissionService.getSubmissionDetail(submission);

    const titleLocale = problem.locales.includes(request.locale) ? request.locale : problem.locales[0];

    return {
      partialMeta: {
        id: submission.id,
        isPublic: submission.isPublic,
        codeLanguage: submission.codeLanguage,
        answerSize: submission.answerSize,
        score: submission.score,
        status: submission.status,
        submitTime: submission.submitTime,
        problem: await this.problemService.getProblemMeta(problem),
        problemTitle: await this.problemService.getProblemLocalizedTitle(problem, titleLocale),
        submitter: await this.userService.getUserMeta(submitter),
        // These two properties are omitted, since the client could parse it from the result
        timeUsed: null,
        memoryUsed: null
      },
      content: submissionDetail.content,
      result: submissionDetail.result
    };
  }
}
