import { ApiProperty } from "@nestjs/swagger";

export enum CreateContestAnnouncementResponseError {
  NO_SUCH_CONTEST = "NO_SUCH_CONTEST",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class CreateContestAnnouncementResponseDto {
  @ApiProperty()
  error?: CreateContestAnnouncementResponseError;

  @ApiProperty()
  id?: number;

  @ApiProperty()
  publishTime?: Date;
}
