import { ApiProperty } from "@nestjs/swagger";

export enum CreateContestIssueResponseError {
  NO_SUCH_CONTEST = "NO_SUCH_CONTEST",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class CreateContestIssueResponseDto {
  @ApiProperty()
  error?: CreateContestIssueResponseError;

  @ApiProperty()
  id?: number;

  @ApiProperty()
  submitTime?: Date;
}
