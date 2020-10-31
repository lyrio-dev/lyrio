import { ApiProperty } from "@nestjs/swagger";

import { IsInt, IsString } from "class-validator";

export class UpdateDiscussionReplyRequestDto {
  @IsInt()
  @ApiProperty()
  discussionReplyId: number;

  @IsString()
  @ApiProperty()
  content: string;
}
