import { ApiProperty } from "@nestjs/swagger";

import { IsInt, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

import { UserPreferenceDto } from "./user-preference.dto";

export class UpdateUserPreferenceRequestDto {
  @ApiProperty()
  @IsInt()
  userId: number;

  @ApiProperty()
  @ValidateNested()
  @Type(() => UserPreferenceDto)
  preference: UserPreferenceDto;
}
