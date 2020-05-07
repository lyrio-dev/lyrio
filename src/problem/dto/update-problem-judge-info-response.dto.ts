import { ApiProperty } from "@nestjs/swagger";

export enum UpdateProblemJudgeInfoResponseError {
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  INVALID_JUDGE_INFO = "INVALID_JUDGE_INFO"
}

export class UpdateProblemJudgeInfoResponseDto {
  @ApiProperty()
  error?: UpdateProblemJudgeInfoResponseError;

  @ApiProperty({ type: [String] })
  judgeInfoError?: string[];
}
