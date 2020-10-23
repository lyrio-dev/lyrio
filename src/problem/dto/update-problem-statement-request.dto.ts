import { ApiProperty } from "@nestjs/swagger";

import {
  ValidateNested,
  IsEnum,
  IsString,
  Length,
  IsOptional,
  IsArray,
  ArrayMaxSize,
  IsInt,
  ArrayNotEmpty
} from "class-validator";
import { Type } from "class-transformer";

import { Locale } from "@/common/locale.type";
import { If } from "@/common/validators";

import { ProblemContentSectionDto } from "./problem-content-section.dto";
import { ProblemSampleDataMemberDto } from "./problem-sample-data-member.dto";

export class UpdateProblemRequestUpdatingLocalizedContentDto {
  @ApiProperty()
  @IsEnum(Locale)
  readonly locale: Locale;

  @ApiProperty()
  @IsString()
  @Length(0, 120)
  @IsOptional()
  readonly title: string;

  @ApiProperty({ type: ProblemContentSectionDto, isArray: true })
  @ValidateNested({ each: true })
  @Type(() => ProblemContentSectionDto)
  @IsArray()
  @ArrayMaxSize(20)
  @IsOptional()
  readonly contentSections: ProblemContentSectionDto[];
}

export class UpdateProblemStatementRequestDto {
  @ApiProperty()
  @IsInt()
  readonly problemId: number;

  @ApiProperty({
    type: UpdateProblemRequestUpdatingLocalizedContentDto,
    isArray: true
  })
  @ValidateNested({ each: true })
  @Type(() => UpdateProblemRequestUpdatingLocalizedContentDto)
  @If<UpdateProblemRequestUpdatingLocalizedContentDto[]>(
    updatingLocalizedContents =>
      new Set(updatingLocalizedContents.map(updatingLocalizedContent => updatingLocalizedContent.locale)).size ===
      updatingLocalizedContents.length,
    {
      message: "locale is not unique"
    }
  )
  @IsArray()
  @ArrayNotEmpty()
  readonly localizedContents: UpdateProblemRequestUpdatingLocalizedContentDto[];

  @ApiProperty({ type: ProblemSampleDataMemberDto, isArray: true })
  @ValidateNested({ each: true })
  @Type(() => ProblemSampleDataMemberDto)
  @IsArray()
  @IsOptional()
  readonly samples: ProblemSampleDataMemberDto[];

  @ApiProperty({ type: [Number] })
  @IsInt({ each: true })
  @IsArray()
  @ArrayMaxSize(20)
  readonly problemTagIds: number[];
}
