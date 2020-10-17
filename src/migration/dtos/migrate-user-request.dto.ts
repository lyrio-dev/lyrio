import { ApiProperty } from "@nestjs/swagger";

import { IsOptional, IsString, Length, MaxLength } from "class-validator";

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
  @Length(6, 32)
  @IsString()
  newPassword: string;
}
