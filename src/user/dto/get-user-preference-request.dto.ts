import { ApiProperty } from "@nestjs/swagger";

import { IsInt } from "class-validator";

export class GetUserPreferenceRequestDto {
  @ApiProperty()
  @IsInt()
  userId: number;
}
