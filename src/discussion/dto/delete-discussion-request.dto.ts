import { ApiProperty } from "@nestjs/swagger";

import { IsInt } from "class-validator";

export class DeleteDiscussionRequestDto {
  @IsInt()
  @ApiProperty()
  discussionId: number;
}
