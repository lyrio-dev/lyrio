import { ApiProperty } from "@nestjs/swagger";

export enum ChangeProblemTypeResponseError {
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  PROBLEM_HAS_SUBMISSION = "PROBLEM_HAS_SUBMISSION"
}

export class ChangeProblemTypeResponseDto {
  @ApiProperty()
  error?: ChangeProblemTypeResponseError;
}
