import { ApiProperty } from "@nestjs/swagger";

import { IsInt, IsObject } from "class-validator";

export class SubmitRequestDto {
  @ApiProperty()
  @IsInt()
  readonly problemId: number;

  @ApiProperty()
  @IsObject()
  readonly content: unknown;
}
