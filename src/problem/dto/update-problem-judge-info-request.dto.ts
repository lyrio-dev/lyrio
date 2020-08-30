import { ApiProperty } from "@nestjs/swagger";

import { IsObject, IsInt } from "class-validator";

import { ProblemJudgeInfo } from "../problem-judge-info.interface";

export class UpdateProblemJudgeInfoRequestDto {
  @ApiProperty()
  @IsInt()
  readonly problemId: number;

  @ApiProperty()
  @IsObject()
  readonly judgeInfo?: ProblemJudgeInfo;
}
