import { ApiProperty } from "@nestjs/swagger";

import { IsInt } from "class-validator";

export class DeleteGroupRequestDto {
  @ApiProperty()
  @IsInt()
  readonly groupId: number;
}
