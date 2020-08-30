import { ApiProperty } from "@nestjs/swagger";

import { IsInt } from "class-validator";

export class SetProblemDisplayIdRequestDto {
  @ApiProperty()
  @IsInt()
  readonly problemId: number;

  @ApiProperty()
  @IsInt()
  readonly displayId: number;
}
