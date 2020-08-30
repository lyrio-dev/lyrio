import { ApiProperty } from "@nestjs/swagger";

import { IsInt } from "class-validator";

export class GetUserSecuritySettingsRequestDto {
  @ApiProperty()
  @IsInt()
  userId: number;
}
