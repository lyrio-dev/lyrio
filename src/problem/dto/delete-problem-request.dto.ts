import { ApiProperty } from "@nestjs/swagger";

import { IsInt } from "class-validator";

export class DeleteProblemRequestDto {
  @ApiProperty()
  @IsInt()
  readonly problemId: number;
}
