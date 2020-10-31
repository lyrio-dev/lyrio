import { ApiProperty } from "@nestjs/swagger";

import { IsEmail, IsEnum } from "class-validator";

import { Locale } from "@/common/locale.type";

import { EmailVerificationCodeType } from "../auth-email-verification-code.service";

export class SendEmailVerificationCodeRequestDto {
  @ApiProperty()
  @IsEmail()
  readonly email: string;

  @ApiProperty()
  @IsEnum(EmailVerificationCodeType)
  readonly type: EmailVerificationCodeType;

  @ApiProperty()
  @IsEnum(Locale)
  readonly locale: Locale;
}
