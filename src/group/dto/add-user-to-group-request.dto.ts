import { ApiProperty } from "@nestjs/swagger";

import { IsInt } from "class-validator";

export class AddUserToGroupRequestDto {
  @ApiProperty()
  @IsInt()
  readonly userId: number;

  @ApiProperty()
  @IsInt()
  readonly groupId: number;
}
