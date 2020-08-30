import { ApiProperty } from "@nestjs/swagger";

import { IsEnum } from "class-validator";

import { Locale } from "@/common/locale.type";

export class GetAllProblemTagsRequestDto {
  @ApiProperty()
  @IsEnum(Locale)
  locale: Locale;
}
