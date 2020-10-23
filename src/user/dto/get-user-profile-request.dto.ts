import { ApiProperty } from "@nestjs/swagger";

import { IsInt } from "class-validator";

export class GetUserProfileRequestDto {
  @ApiProperty()
  @IsInt()
  userId: number;
}
