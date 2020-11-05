import { ApiProperty } from "@nestjs/swagger";

import { IsEmail, IsOptional, IsString, MaxLength } from "class-validator";

export class LoginRequestDto {
  @ApiProperty({
    description: "A SYZOJ 2 username is allowed to check if a user is not migrated."
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  readonly username?: string;

  @ApiProperty()
  @IsEmail()
  @IsOptional()
  readonly email?: string;

  @ApiProperty()
  @IsString()
  readonly password: string;
}
