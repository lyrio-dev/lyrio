import { ApiProperty } from "@nestjs/swagger";

export enum RemoveProblemFileResponseError {
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_FILE = "NO_SUCH_FILE"
}

export class RemoveProblemFileResponseDto {
  @ApiProperty()
  error?: RemoveProblemFileResponseError;
}
