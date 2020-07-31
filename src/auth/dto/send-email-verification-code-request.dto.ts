import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsEnum } from "class-validator";
import { Locale } from "@/common/locale.type";

export class SendEmailVerificationCodeRequestDto {
  @ApiProperty()
  @IsEmail()
  readonly email: string;

  @ApiProperty()
  @IsEnum(Locale)
  readonly locale: Locale;
}
