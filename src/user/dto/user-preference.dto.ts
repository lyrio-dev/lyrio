import { Locale } from "@/common/locale.type";
import { IsEnum, IsOptional, IsBoolean, IsString, MaxLength, IsObject } from "class-validator";

export class UserPreferenceDto {
  @IsEnum(Locale)
  @IsOptional()
  locale?: Locale;

  @IsBoolean()
  @IsOptional()
  formatCodeByDefault?: boolean;

  @IsString()
  @MaxLength(1024)
  @IsOptional()
  codeFormatterOptions?: string;

  @IsObject()
  @IsOptional()
  languageOptions?: Record<string, Record<string, string>>;
}
