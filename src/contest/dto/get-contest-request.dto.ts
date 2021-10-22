import { ApiProperty } from "@nestjs/swagger";

import { IsBoolean, IsEnum, IsInt } from "class-validator";

import { Locale } from "@/common/locale.type";

export class GetContestRequestDto {
  @ApiProperty()
  @IsInt()
  contestId: number;

  @ApiProperty()
  @IsBoolean()
  realRanklist: boolean;

  @ApiProperty()
  @IsEnum(Locale)
  locale: Locale;
}
