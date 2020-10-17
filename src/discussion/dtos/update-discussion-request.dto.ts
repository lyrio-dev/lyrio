import { ApiProperty } from "@nestjs/swagger";

import { IsInt, IsString, Length } from "class-validator";

export class UpdateDiscussionRequestDto {
  @IsInt()
  @ApiProperty()
  discussionId: number;

  @IsString()
  @Length(0, 80)
  @ApiProperty()
  title: string;

  @IsString()
  @ApiProperty()
  content: string;
}
