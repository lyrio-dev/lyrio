import { ApiProperty } from "@nestjs/swagger";

import { IsEnum, IsInt } from "class-validator";

import { Locale } from "@/common/locale.type";

export class GetContestEditDataRequestDto {
  @ApiProperty()
  @IsInt()
  contestId: number;

  @ApiProperty()
  @IsEnum(Locale)
  locale: Locale;
}
