import { ApiProperty } from "@nestjs/swagger";

import { IsInt, Max, Min } from "class-validator";

export class SetProblemDisplayIdRequestDto {
  @ApiProperty()
  @IsInt()
  readonly problemId: number;

  @ApiProperty()
  @IsInt()
  @Min(-100000000)
  @Max(100000000)
  readonly displayId: number;
}
