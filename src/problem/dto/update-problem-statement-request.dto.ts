import { ApiProperty } from "@nestjs/swagger";
import {
  ValidateNested,
  IsEnum,
  IsString,
  Length,
  IsOptional,
  IsBoolean,
  IsArray,
  ArrayMaxSize,
  IsInt
} from "class-validator";
import { Locale } from "@/common/locale.type";
import { If } from "@/common/validators";

import { ProblemContentSectionDto } from "./problem-content-section.dto";
import { ProblemSampleDataMemberDto } from "./problem-sample-data-member.dto";

export class UpdateProblemRequestUpdatingLocalizedContentDto {
  @ApiProperty()
  @IsEnum(Locale)
  readonly locale: Locale;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  readonly delete?: boolean;

  @ApiProperty()
  @IsString()
  @Length(1, 120)
  @IsOptional()
  readonly title?: string;

  @ApiProperty({ type: ProblemContentSectionDto, isArray: true })
  @ValidateNested({ each: true })
  @IsArray()
  @ArrayMaxSize(20)
  @IsOptional()
  readonly contentSections?: ProblemContentSectionDto[];
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
  @If<UpdateProblemRequestUpdatingLocalizedContentDto[]>(
    updatingLocalizedContents =>
      new Set(
        updatingLocalizedContents.map(
          updatingLocalizedContent => updatingLocalizedContent.locale
        )
      ).size === updatingLocalizedContents.length,
    {
      message: "locale is not unique"
    }
  )
  @IsArray()
  readonly updatingLocalizedContents: UpdateProblemRequestUpdatingLocalizedContentDto[];

  @ApiProperty({ type: ProblemSampleDataMemberDto, isArray: true })
  @ValidateNested({ each: true })
  @IsArray()
  @IsOptional()
  readonly samples?: ProblemSampleDataMemberDto[];
}
