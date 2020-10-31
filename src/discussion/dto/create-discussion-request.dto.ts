import { ApiProperty } from "@nestjs/swagger";

import { IsInt, IsOptional, IsString, Length } from "class-validator";

export class CreateDiscussionRequestDto {
  @IsInt()
  @IsOptional()
  @ApiProperty()
  problemId?: number;

  @IsString()
  @Length(0, 80)
  @ApiProperty()
  title: string;

  @IsString()
  @ApiProperty()
  content: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  isPublic?: boolean;
}
