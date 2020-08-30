import { ApiProperty } from "@nestjs/swagger";

import { IsInt, IsBoolean } from "class-validator";

export class SetProblemPublicRequestDto {
  @ApiProperty()
  @IsInt()
  readonly problemId: number;

  @ApiProperty()
  @IsBoolean()
  readonly isPublic: boolean;
}
