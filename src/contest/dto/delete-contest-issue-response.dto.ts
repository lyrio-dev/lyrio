import { ApiProperty } from "@nestjs/swagger";

export enum DeleteContestIssueResponseError {
  NO_SUCH_CONTEST_ISSUE = "NO_SUCH_CONTEST_ISSUE",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class DeleteContestIssueResponseDto {
  @ApiProperty()
  error?: DeleteContestIssueResponseError;
}
