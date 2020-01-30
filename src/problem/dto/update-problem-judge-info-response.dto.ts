import { ApiProperty } from "@nestjs/swagger";

export enum UpdateProblemJudgeInfoResponseError {
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class UpdateProblemJudgeInfoResponseDto {
  @ApiProperty()
  error?: UpdateProblemJudgeInfoResponseError;
}
