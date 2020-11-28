import { ApiProperty } from "@nestjs/swagger";

import { IsString, Length, ValidateNested, IsEnum, ArrayNotEmpty, IsArray, ArrayMaxSize, IsInt } from "class-validator";
import { Type } from "class-transformer";

import { Locale } from "@/common/locale.type";
import { If } from "@/common/validators";

import { ProblemSampleDataMemberDto } from "./problem-sample-data-member.dto";
import { ProblemContentSectionDto } from "./problem-content-section.dto";

export class ProblemLocalizedContentDto {
  @ApiProperty()
  @IsEnum(Locale)
  locale: Locale;

  @ApiProperty()
  @IsString()
  @Length(0, 120)
  title: string;

  @ApiProperty({ type: ProblemContentSectionDto, isArray: true })
  @ValidateNested({ each: true })
  @Type(() => ProblemContentSectionDto)
  @IsArray()
  @ArrayMaxSize(20)
  contentSections: ProblemContentSectionDto[];
}

export class ProblemStatementDto {
  @ApiProperty({ type: ProblemLocalizedContentDto, isArray: true })
  @ValidateNested({ each: true })
  @Type(() => ProblemLocalizedContentDto)
  @If<ProblemLocalizedContentDto[]>(
    localizedContents =>
      new Set(localizedContents.map(localizedContent => localizedContent.locale)).size === localizedContents.length,
    {
      message: "locale is not unique"
    }
  )
  @ArrayNotEmpty()
  @IsArray()
  localizedContents: ProblemLocalizedContentDto[];

  @ApiProperty({ type: ProblemSampleDataMemberDto, isArray: true })
  @ValidateNested({ each: true })
  @Type(() => ProblemSampleDataMemberDto)
  @IsArray()
  samples: ProblemSampleDataMemberDto[];

  @ApiProperty({ type: [Number] })
  @IsInt({ each: true })
  @IsArray()
  @ArrayMaxSize(20)
  problemTagIds: number[];
}
