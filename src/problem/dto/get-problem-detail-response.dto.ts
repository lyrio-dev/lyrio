import { ApiProperty } from "@nestjs/swagger";

import { Locale } from "@/common/locale.type";

import { ProblemMetaDto } from "./problem-meta.dto";
import { ProblemContentSectionDto } from "./problem-content-section.dto";
import { ProblemSampleDataMemberDto } from "./problem-sample-data-member.dto";
import { ProblemJudgeInfo } from "../judge-info/problem-judge-info.interface";

export enum GetProblemDetailResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM"
}

export class GetProblemDetailResponseDto {
  @ApiProperty()
  error?: GetProblemDetailResponseError;

  @ApiProperty()
  meta?: ProblemMetaDto;

  @ApiProperty()
  title?: string;

  @ApiProperty()
  titleLocale?: Locale;

  @ApiProperty({ type: ProblemSampleDataMemberDto, isArray: true })
  samples?: ProblemSampleDataMemberDto[];

  @ApiProperty({ type: ProblemContentSectionDto, isArray: true })
  contentSections?: ProblemContentSectionDto[];

  @ApiProperty()
  contentLocale?: Locale;

  @ApiProperty()
  judgeInfo?: ProblemJudgeInfo;
}
