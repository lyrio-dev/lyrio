import { ApiProperty } from "@nestjs/swagger";

import { IsInt, IsOptional, IsEnum, IsBoolean } from "class-validator";

import { Locale } from "@/common/locale.type";

export class GetProblemRequestDto {
  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  readonly id?: number;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  readonly displayId?: number;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  readonly owner?: boolean;

  @ApiProperty({ required: false })
  @IsEnum(Locale)
  @IsOptional()
  readonly localizedContentsOfLocale?: Locale;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  readonly localizedContentsTitleOnly?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  readonly localizedContentsOfAllLocales?: boolean;

  @ApiProperty({ required: false })
  @IsEnum(Locale)
  @IsOptional()
  readonly tagsOfLocale?: Locale;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  readonly tagsOfAllLocales?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  readonly samples?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  readonly judgeInfo?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  readonly judgeInfoToBePreprocessed?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  readonly testData?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  readonly additionalFiles?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  readonly statistics?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  readonly discussionCount?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  readonly permissionOfCurrentUser?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  readonly permissions?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  readonly lastSubmissionAndLastAcceptedSubmission?: boolean;
}
