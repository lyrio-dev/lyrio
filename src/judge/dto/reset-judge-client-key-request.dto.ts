import { ApiProperty } from "@nestjs/swagger";

import { IsInt } from "class-validator";

export class ResetJudgeClientKeyRequestDto {
  @ApiProperty()
  @IsInt()
  id: number;
}
