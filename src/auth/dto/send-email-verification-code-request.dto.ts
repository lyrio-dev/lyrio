import { ApiProperty } from "@nestjs/swagger";

import { IsEmail, IsEnum } from "class-validator";

import { Locale } from "@/common/locale.type";

import { EmailVerifactionCodeType } from "../auth-email-verifaction-code.service";

export class SendEmailVerificationCodeRequestDto {
  @ApiProperty()
  @IsEmail()
  readonly email: string;

  @ApiProperty()
  @IsEnum(EmailVerifactionCodeType)
  readonly type: EmailVerifactionCodeType;

  @ApiProperty()
  @IsEnum(Locale)
  readonly locale: Locale;
}
