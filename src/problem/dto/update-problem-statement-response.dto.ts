import { ApiProperty } from "@nestjs/swagger";

export enum UpdateProblemStatementResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM",
  FAILED = "FAILED"
}

export class UpdateProblemStatementResponseDto {
  @ApiProperty()
  error?: UpdateProblemStatementResponseError;
}
