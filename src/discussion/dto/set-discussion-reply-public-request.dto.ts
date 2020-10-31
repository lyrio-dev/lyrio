import { ApiProperty } from "@nestjs/swagger";

import { IsBoolean, IsInt } from "class-validator";

export class SetDiscussionReplyPublicRequestDto {
  @IsInt()
  @ApiProperty()
  discussionReplyId: number;

  @IsBoolean()
  @ApiProperty()
  isPublic: boolean;
}
