import { ApiProperty } from "@nestjs/swagger";

import { IsBoolean, IsEnum, IsInt, IsString } from "class-validator";

import { DiscussionReactionType } from "../discussion.service";

export class ToggleReactionRequestDto {
  @IsEnum(DiscussionReactionType)
  @ApiProperty()
  type: DiscussionReactionType;

  @IsInt()
  @ApiProperty()
  id: number;

  @IsString()
  @ApiProperty()
  emoji: string;

  @IsBoolean()
  reaction: boolean;
}
