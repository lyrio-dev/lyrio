import { ApiProperty } from "@nestjs/swagger";

export enum SetSubmissionPublicResponseError {
  NO_SUCH_SUBMISSION = "NO_SUCH_SUBMISSION",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class SetSubmissionPublicResponseDto {
  @ApiProperty()
  error?: SetSubmissionPublicResponseError;
}
