import { Controller, Post, Body, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import {
  UserPrivilegeService,
  UserPrivilegeType
} from "@/user/user-privilege.service";
import { ProblemService } from "./problem.service";
import { CurrentUser } from "@/common/user.decorator";
import { UserEntity } from "@/user/user.entity";
import { ProblemEntity } from "./problem.entity";

import {
  CreateProblemRequestDto,
  CreateProblemResponseDto,
  CreateProblemResponseError,
  UpdateProblemStatementResponseDto,
  UpdateProblemStatementRequestDto,
  UpdateProblemStatementResponseError,
  GetProblemDetailRequestDto,
  GetProblemDetailResponseDto,
  GetProblemDetailResponseError
} from "./dto";

@ApiTags("Problem")
@Controller("problem")
export class ProblemController {
  constructor(
    private readonly problemService: ProblemService,
    private readonly userPrivilegeService: UserPrivilegeService
  ) {}

  @Post("create")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Create a problem with given statement and default judge info."
  })
  async create(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: CreateProblemRequestDto
  ): Promise<CreateProblemResponseDto> {
    if (!currentUser)
      return {
        error: CreateProblemResponseError.PERMISSION_DENIED
      };

    const problem = await this.problemService.createProblem(
      currentUser,
      request.type,
      request.statement
    );
    if (!problem)
      return {
        error: CreateProblemResponseError.FAILED
      };

    return {
      id: problem.id
    };
  }

  @Post("updateStatement")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Update a problem's statement."
  })
  async updateStatement(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: UpdateProblemStatementRequestDto
  ): Promise<UpdateProblemStatementResponseDto> {
    if (!currentUser)
      return {
        error: UpdateProblemStatementResponseError.PERMISSION_DENIED
      };

    const problem = await this.problemService.findProblemById(
      request.problemId
    );
    if (!problem)
      return {
        error: UpdateProblemStatementResponseError.NO_SUCH_PROBLEM
      };

    if (
      !(
        problem.ownerId == currentUser.id ||
        currentUser.isAdmin ||
        (await this.userPrivilegeService.userHasPrivilege(
          currentUser,
          UserPrivilegeType.MANAGE_PROBLEM
        ))
      )
    )
      return {
        error: UpdateProblemStatementResponseError.PERMISSION_DENIED
      };

    const success = await this.problemService.updateProblemStatement(
      problem,
      request
    );

    if (!success)
      return {
        error: UpdateProblemStatementResponseError.FAILED
      };

    return {};
  }

  @Get("getProblemDetail")
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Get a problem's meta, title, contents, samples, judge info of given locale.",
    description:
      "Title and contents are fallbacked to another locale if none for given locale."
  })
  async getProblemDetail(
    @CurrentUser() currentUser: UserEntity,
    @Query() request: GetProblemDetailRequestDto
  ): Promise<GetProblemDetailResponseDto> {
    let problem: ProblemEntity;
    if (request.id)
      problem = await this.problemService.findProblemById(parseInt(request.id));
    else if (request.displayId)
      problem = await this.problemService.findProblemByDisplayId(
        parseInt(request.displayId)
      );

    if (!problem)
      return {
        error: GetProblemDetailResponseError.NO_SUCH_PROBLEM
      };

    if (!problem.isPublic) {
      if (
        !(
          currentUser &&
          (problem.ownerId == currentUser.id ||
            currentUser.isAdmin ||
            (await this.userPrivilegeService.userHasPrivilege(
              currentUser,
              UserPrivilegeType.MANAGE_PROBLEM
            )))
        )
      )
        return {
          error: GetProblemDetailResponseError.PERMISSION_DENIED
        };
    }

    const [
      titleLocale,
      title
    ] = await this.problemService.getProblemLocalizedTitle(
      problem,
      request.locale
    );
    const [
      contentLocale,
      contentSections
    ] = await this.problemService.getProblemLocalizedContent(
      problem,
      request.locale
    );
    const samples = await this.problemService.getProblemSamples(problem);
    const judgeInfo = await this.problemService.getProblemJudgeInfo(problem);

    return {
      meta: {
        id: problem.id,
        displayId: problem.displayId,
        type: problem.type,
        isPublic: problem.isPublic,
        ownerId: problem.ownerId,
        locales: problem.locales
      },
      title: title,
      titleLocale: titleLocale,
      samples: samples,
      contentSections: contentSections,
      contentLocale: contentLocale,
      judgeInfo: judgeInfo
    };
  }
}
