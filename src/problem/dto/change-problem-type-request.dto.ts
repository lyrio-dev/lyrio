import { ApiProperty } from "@nestjs/swagger";

import { ProblemType } from "../problem.entity";

export class ChangeProblemTypeRequestDto {
  @ApiProperty()
  problemId: number;

  @ApiProperty()
  type: ProblemType;
}
