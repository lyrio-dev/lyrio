import { ApiProperty } from "@nestjs/swagger";

export enum RejudgeContestResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_CONTEST = "NO_SUCH_CONTEST",
  REJUDGE_ALREADY_RUNNING = "REJUDGE_ALREADY_RUNNING"
}

export class RejudgeContestResponseDto {
  @ApiProperty()
  error?: RejudgeContestResponseError;

  @ApiProperty()
  progressSubscriptionKey?: string;
}
