import { Locale } from "@/common/locale.type";
import { IsEnum, IsOptional, IsBoolean, IsString, MaxLength, IsObject } from "class-validator";

export class UserPreferenceDto {
  @IsEnum(Locale)
  @IsOptional()
  systemLocale?: Locale;

  @IsEnum(Locale)
  @IsOptional()
  contentLocale?: Locale;

  @IsBoolean()
  @IsOptional()
  doNotFormatCodeByDefault?: boolean;

  @IsString()
  @MaxLength(1024)
  @IsOptional()
  codeFormatterOptions?: string;

  @IsString()
  @MaxLength(20)
  defaultCodeLanguage?: string;

  @IsObject()
  @IsOptional()
  defaultCodeLanguageOptions?: Record<string, string>;
}
