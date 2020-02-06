import { ApiProperty } from "@nestjs/swagger";

export enum SubmitResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM"
}

export class SubmitResponseDto {
  @ApiProperty()
  error?: SubmitResponseError;

  @ApiProperty()
  submissionId?: number;
}
