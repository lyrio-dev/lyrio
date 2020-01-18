import { ApiProperty } from "@nestjs/swagger";

import { Locale } from "@/common/locale.type";

import { ProblemMetaDto } from "./problem-meta.dto";
import { ProblemContentSectionDto } from "./problem-content-section.dto";
import { ProblemSampleDataMemberDto } from "./problem-sample-data-member.dto";
import { ProblemJudgeInfo } from "../judge-info/problem-judge-info.interface";
import { ProblemPermissionType } from "../problem.service";
import { ProblemFileDto } from "./problem-file.dto";

export enum GetProblemDetailResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM"
}

export class GetProblemDetailResponseDto {
  @ApiProperty({ enum: GetProblemDetailResponseError })
  error?: GetProblemDetailResponseError;

  @ApiProperty()
  meta?: ProblemMetaDto;

  @ApiProperty()
  permission?: Record<ProblemPermissionType, boolean>;

  @ApiProperty()
  title?: string;

  @ApiProperty()
  resultLocale?: Locale;

  @ApiProperty({ type: ProblemSampleDataMemberDto, isArray: true })
  samples?: ProblemSampleDataMemberDto[];

  @ApiProperty({ type: ProblemContentSectionDto, isArray: true })
  contentSections?: ProblemContentSectionDto[];

  @ApiProperty({ type: ProblemFileDto, isArray: true })
  additionalFiles?: ProblemFileDto[];

  @ApiProperty()
  judgeInfo?: ProblemJudgeInfo;
}
