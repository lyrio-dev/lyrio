import { ApiProperty } from "@nestjs/swagger";

import { IsEmail, Length, IsString } from "class-validator";

export class ResetPasswordRequestDto {
  @ApiProperty()
  @IsEmail()
  readonly email: string;

  @ApiProperty()
  @IsString()
  readonly emailVerificationCode?: string;

  @ApiProperty()
  @Length(6, 32)
  readonly newPassword: string;
}
