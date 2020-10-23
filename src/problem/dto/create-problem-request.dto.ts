import { ApiProperty } from "@nestjs/swagger";

import { ValidateNested, IsEnum } from "class-validator";
import { Type } from "class-transformer";

import { ProblemStatementDto } from "./problem-statement.dto";

import { ProblemType } from "../problem.entity";

export class CreateProblemRequestDto {
  @ApiProperty()
  @IsEnum(ProblemType)
  readonly type: ProblemType;

  @ApiProperty()
  @ValidateNested()
  @Type(() => ProblemStatementDto)
  readonly statement: ProblemStatementDto;
}
