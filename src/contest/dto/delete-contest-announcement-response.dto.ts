import { ApiProperty } from "@nestjs/swagger";

export enum DeleteContestAnnouncementResponseError {
  NO_SUCH_CONTEST_ISSUE = "NO_SUCH_CONTEST_ISSUE",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class DeleteContestAnnouncementResponseDto {
  @ApiProperty()
  error?: DeleteContestAnnouncementResponseError;
}
