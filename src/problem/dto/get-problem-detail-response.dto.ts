import { ApiModelProperty } from "@nestjs/swagger";

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
  @ApiModelProperty()
  error?: GetProblemDetailResponseError;

  @ApiModelProperty()
  meta?: ProblemMetaDto;

  @ApiModelProperty()
  title?: string;

  @ApiModelProperty()
  titleLocale?: Locale;

  @ApiModelProperty({ type: ProblemSampleDataMemberDto, isArray: true })
  samples?: ProblemSampleDataMemberDto[];

  @ApiModelProperty({ type: ProblemContentSectionDto, isArray: true })
  contentSections?: ProblemContentSectionDto[];

  @ApiModelProperty()
  contentLocale?: Locale;

  @ApiModelProperty()
  judgeInfo?: ProblemJudgeInfo;
}
