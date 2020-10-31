import { ApiProperty } from "@nestjs/swagger";

import { IsBoolean, IsInt } from "class-validator";

export class SetDiscussionPublicRequestDto {
  @IsInt()
  @ApiProperty()
  discussionId: number;

  @IsBoolean()
  @ApiProperty()
  isPublic: boolean;
}
