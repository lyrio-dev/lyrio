import { ApiProperty } from "@nestjs/swagger";

import { IsInt } from "class-validator";

export class DeleteJudgeClientRequestDto {
  @ApiProperty()
  @IsInt()
  id: number;
}
