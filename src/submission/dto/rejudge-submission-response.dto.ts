import { ApiProperty } from "@nestjs/swagger";

export enum RejudgeSubmissionResponseError {
  NO_SUCH_SUBMISSION = "NO_SUCH_SUBMISSION",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class RejudgeSubmissionResponseDto {
  @ApiProperty()
  error?: RejudgeSubmissionResponseError;
}
