import { ApiProperty } from "@nestjs/swagger";

import { IsInt, IsOptional, IsString } from "class-validator";

export class CreateDiscussionReplyRequestDto {
  @IsInt()
  @ApiProperty()
  discussionId: number;

  @IsString()
  @ApiProperty()
  content: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  isPublic?: boolean;
}
