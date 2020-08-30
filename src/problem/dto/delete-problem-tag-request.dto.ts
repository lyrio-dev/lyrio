import { ApiProperty } from "@nestjs/swagger";

import { IsInt } from "class-validator";

export class DeleteProblemTagRequestDto {
  @ApiProperty()
  @IsInt()
  id: number;
}
