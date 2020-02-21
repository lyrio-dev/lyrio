import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Min, IsEnum } from "class-validator";

import { Locale } from "@/common/locale.type";
import { SubmissionStatisticsType } from "../submission-statistics.service";

export class QuerySubmissionStatisticsRequestDto {
  @ApiProperty({ enum: Locale })
  @IsEnum(Locale)
  locale: Locale;

  @ApiProperty()
  @IsInt()
  problemId: number;

  @ApiProperty()
  @IsEnum(SubmissionStatisticsType)
  statisticsType: SubmissionStatisticsType;

  @ApiProperty()
  @IsInt()
  @Min(0)
  skipCount: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  takeCount: number;
}
