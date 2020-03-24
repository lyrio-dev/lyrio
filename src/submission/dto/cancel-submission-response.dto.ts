import { ApiProperty } from "@nestjs/swagger";

export enum CancelSubmissionResponseError {
  NO_SUCH_SUBMISSION = "NO_SUCH_SUBMISSION",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class CancelSubmissionResponseDto {
  @ApiProperty()
  error?: CancelSubmissionResponseError;
}
