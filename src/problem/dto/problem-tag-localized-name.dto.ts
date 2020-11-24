import { IsString, Length, IsEnum } from "class-validator";

import { Locale } from "@/common/locale.type";

export class ProblemTagLocalizedNameDto {
  @IsString()
  @Length(1, 60)
  name: string;

  @IsEnum(Locale)
  locale: Locale;
}
