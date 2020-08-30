import { ApiProperty } from "@nestjs/swagger";

import { IsEmail, IsString, IsOptional } from "class-validator";

export class UpdateUserSelfEmailRequestDto {
  @ApiProperty()
  @IsEmail()
  readonly email: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  readonly emailVerificationCode?: string;
}
