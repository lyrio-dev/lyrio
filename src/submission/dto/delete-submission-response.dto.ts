import { ApiProperty } from "@nestjs/swagger";

export enum DeleteSubmissionResponseError {
  NO_SUCH_SUBMISSION = "NO_SUCH_SUBMISSION",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class DeleteSubmissionResponseDto {
  @ApiProperty()
  error?: DeleteSubmissionResponseError;
}
