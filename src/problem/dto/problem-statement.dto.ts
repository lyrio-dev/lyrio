import { ApiModelProperty } from "@nestjs/swagger";
import {
  IsString,
  Length,
  ValidateNested,
  IsEnum,
  ArrayNotEmpty,
  IsArray,
  ArrayMaxSize
} from "class-validator";

import { Locale } from "@/common/locale.type";
import { If } from "@/common/validators";

import { ProblemSampleDataMemberDto } from "./problem-sample-data-member.dto";
import { ProblemContentSectionDto } from "./problem-content-section.dto";

export class ProblemLocalizedContentDto {
  @ApiModelProperty()
  @IsEnum(Locale)
  readonly locale: Locale;

  @ApiModelProperty()
  @IsString()
  @Length(1, 120)
  readonly title: string;

  @ApiModelProperty({ type: ProblemContentSectionDto, isArray: true })
  @ValidateNested({ each: true })
  @IsArray()
  @ArrayMaxSize(20)
  readonly contentSections: ProblemContentSectionDto[];
}

export class ProblemStatementDto {
  @ApiModelProperty({ type: ProblemLocalizedContentDto, isArray: true })
  @ValidateNested({ each: true })
  @If<ProblemLocalizedContentDto[]>(
    localizedContents =>
      new Set(
        localizedContents.map(localizedContent => localizedContent.locale)
      ).size === localizedContents.length,
    {
      message: "locale is not unique"
    }
  )
  @ArrayNotEmpty()
  @IsArray()
  readonly localizedContents: ProblemLocalizedContentDto[];

  @ApiModelProperty({ type: ProblemSampleDataMemberDto, isArray: true })
  @ValidateNested({ each: true })
  @IsArray()
  readonly samples: ProblemSampleDataMemberDto[];
}
