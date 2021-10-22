import { ApiProperty } from "@nestjs/swagger";

export enum ReplyContestIssueResponseError {
  NO_SUCH_CONTEST_ISSUE = "NO_SUCH_CONTEST_ISSUE",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class ReplyContestIssueResponseDto {
  @ApiProperty()
  error?: ReplyContestIssueResponseError;

  @ApiProperty()
  replyTime?: Date;
}
