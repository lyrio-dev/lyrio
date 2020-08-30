import { ApiProperty } from "@nestjs/swagger";

import { IsString, Length, IsArray } from "class-validator";

export class AddJudgeClientRequestDto {
  @ApiProperty()
  @Length(1, 80)
  @IsString()
  name: string;

  @ApiProperty()
  @IsString({ each: true })
  @IsArray()
  allowedHosts: string[];
}
