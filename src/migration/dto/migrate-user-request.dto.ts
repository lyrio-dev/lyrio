import { ApiProperty } from "@nestjs/swagger";

import { IsOptional, IsString, MaxLength } from "class-validator";

import { IsUsername } from "@/common/validators";

export class MigrateUserRequestDto {
  @ApiProperty()
  @IsString()
  @MaxLength(80)
  oldUsername: string;

  @ApiProperty()
  @IsString()
  oldPassword: string;

  @ApiProperty()
  @IsUsername()
  @IsOptional()
  newUsername: string;

  @ApiProperty()
  @IsString()
  newPassword: string;
}
