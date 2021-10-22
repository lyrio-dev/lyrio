import { ApiProperty } from "@nestjs/swagger";

export enum CreateContestResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM",
  INVALID_CONTEST_TYPE_OPTIONS = "INVALID_CONTEST_TYPE_OPTIONS"
}

export class CreateContestResponseDto {
  @ApiProperty()
  error?: CreateContestResponseError;

  @ApiProperty()
  contestId?: number;
}
