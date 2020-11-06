import { ApiProperty } from "@nestjs/swagger";

import { IsInt, IsOptional } from "class-validator";

import { IsUsername } from "@/common/validators";

export class GetUserPreferenceRequestDto {
  @ApiProperty()
  @IsInt()
  @IsOptional()
  userId?: number;

  @ApiProperty()
  @IsUsername()
  @IsOptional()
  username?: string;
}
