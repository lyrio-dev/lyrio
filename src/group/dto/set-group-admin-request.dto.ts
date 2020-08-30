import { ApiProperty } from "@nestjs/swagger";

import { IsNumber, IsBoolean } from "class-validator";

export class SetGroupAdminRequestDto {
  @ApiProperty()
  @IsNumber()
  readonly userId: number;

  @ApiProperty()
  @IsNumber()
  readonly groupId: number;

  @ApiProperty()
  @IsBoolean()
  readonly isGroupAdmin: boolean;
}
