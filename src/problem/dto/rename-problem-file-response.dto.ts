import { ApiProperty } from "@nestjs/swagger";

export enum RenameProblemFileResponseError {
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_FILE = "NO_SUCH_FILE"
}

export class RenameProblemFileResponseDto {
  @ApiProperty()
  error?: RenameProblemFileResponseError;
}
