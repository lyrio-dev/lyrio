import { ApiProperty } from "@nestjs/swagger";

import { IsInt, IsOptional } from "class-validator";

export class RejudgeContestRequestDto {
  @IsInt()
  @ApiProperty()
  contestId: number;

  @IsInt()
  @IsOptional()
  @ApiProperty()
  problemId?: number;
}
