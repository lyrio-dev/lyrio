import { ApiProperty } from "@nestjs/swagger";

import { ProblemJudgeInfo } from "../judge-info/problem-judge-info.interface";
import { IsObject, IsInt } from "class-validator";

export class UpdateProblemJudgeInfoRequestDto {
  @ApiProperty()
  @IsInt()
  readonly problemId: number;

  @ApiProperty()
  @IsObject()
  readonly judgeInfo?: ProblemJudgeInfo;
}
