import { ApiProperty } from "@nestjs/swagger";

import { IsInt } from "class-validator";

export class DeleteContestAnnouncementRequestDto {
  @ApiProperty()
  @IsInt()
  contestAnnouncementId: number;
}
