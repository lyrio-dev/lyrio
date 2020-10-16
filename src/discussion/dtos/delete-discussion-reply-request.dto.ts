import { ApiProperty } from "@nestjs/swagger";

import { IsInt } from "class-validator";

export class DeleteDiscussionReplyRequestDto {
  @IsInt()
  @ApiProperty()
  discussionReplyId: number;
}
