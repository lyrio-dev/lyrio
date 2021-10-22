import { ApiProperty } from "@nestjs/swagger";

import { IsBoolean, IsEnum, IsInt, Min } from "class-validator";

import { Locale } from "@/common/locale.type";

export class QueryRanklistRequestDto {
  @ApiProperty()
  @IsInt()
  contestId: number;

  @ApiProperty()
  @IsBoolean()
  realRanklist: boolean;

  @ApiProperty()
  @IsEnum(Locale)
  locale: Locale;

  @ApiProperty()
  @IsInt()
  @Min(0)
  skipCount: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  takeCount: number;
}
