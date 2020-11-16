import { ApiProperty } from "@nestjs/swagger";

import { IsEnum, IsInt } from "class-validator";

import { ProblemType } from "../problem.entity";

export class ChangeProblemTypeRequestDto {
  @ApiProperty()
  @IsInt()
  problemId: number;

  @ApiProperty()
  @IsEnum(ProblemType)
  type: ProblemType;
}
