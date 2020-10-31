import { ApiProperty } from "@nestjs/swagger";

import { IsEnum } from "class-validator";

import { Locale } from "@/common/locale.type";

export class GetHomepageRequestDto {
  @IsEnum(Locale)
  @ApiProperty()
  locale: Locale;
}
