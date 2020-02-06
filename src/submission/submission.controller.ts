import { Controller, Post, Body, BadRequestException } from "@nestjs/common";
import { ApiOperation, ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "@/common/user.decorator";
import { UserEntity } from "@/user/user.entity";
import { SubmissionService } from "./submission.service";
import { ProblemService, ProblemPermissionType } from "@/problem/problem.service";
import { SubmitRequestDto, SubmitResponseDto, SubmitResponseError } from "./dto";

@ApiTags("Submission")
@Controller("submission")
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService, private readonly problemService: ProblemService) {}

  @ApiOperation({
    summary: "Submit code to a problem."
  })
  @ApiBearerAuth()
  @Post("submit")
  async submit(@CurrentUser() user: UserEntity, @Body() request: SubmitRequestDto): Promise<SubmitResponseDto> {
    if (!user)
      return {
        error: SubmitResponseError.PERMISSION_DENIED
      };

    const problem = await this.problemService.findProblemById(request.problemId);
    if (!problem)
      return {
        error: SubmitResponseError.NO_SUCH_PROBLEM
      };

    // TODO: add "submit" permission
    if (!(await this.problemService.userHasPermission(user, problem, ProblemPermissionType.VIEW)))
      return {
        error: SubmitResponseError.PERMISSION_DENIED
      };

    const [validationError, submission] = await this.submissionService.createSubmission(user, problem, request.content);

    if (validationError && validationError.length > 0) throw new BadRequestException(validationError);

    return {
      submissionId: submission.id
    };
  }
}
