import { ApiProperty } from "@nestjs/swagger";

import { ProblemPermissionType } from "@/problem/problem.service";
import { SubmissionContent } from "@/submission/submission-content.interface";
import { AccessControlListWithSubjectMeta } from "@/permission/permission.service";

import { ProblemMetaDto } from "./problem-meta.dto";
import { ProblemSampleDataMemberDto } from "./problem-sample-data-member.dto";
import { ProblemFileDto } from "./problem-file.dto";
import { ProblemLocalizedContentDto } from "./problem-statement.dto";
import { LocalizedProblemTagDto } from "./localized-problem-tag.dto";
import { ProblemTagWithAllLocalesDto } from "./get-all-problem-tags-of-all-locales-response.dto";

import type { UserMetaDto } from "@/user/dto";
import type { SubmissionBasicMetaDto } from "@/submission/dto";
import type { ContestMetaDto } from "@/contest/dto";

import { ProblemJudgeInfo } from "../problem-judge-info.interface";

export enum GetProblemResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM",
  NO_SUCH_CONTEST = "NO_SUCH_CONTEST"
}

class ProblemLastSubmissionDto {
  @ApiProperty()
  lastSubmission?: SubmissionBasicMetaDto;

  @ApiProperty()
  lastSubmissionContent?: SubmissionContent;

  @ApiProperty()
  lastAcceptedSubmission?: SubmissionBasicMetaDto;
}

export class GetProblemResponseDto {
  @ApiProperty({ enum: GetProblemResponseError })
  error?: GetProblemResponseError;

  @ApiProperty()
  contest?: ContestMetaDto;

  @ApiProperty()
  meta?: ProblemMetaDto;

  @ApiProperty()
  owner?: UserMetaDto;

  @ApiProperty()
  localizedContentsOfLocale?: ProblemLocalizedContentDto;

  @ApiProperty({ type: ProblemLocalizedContentDto, isArray: true })
  localizedContentsOfAllLocales?: ProblemLocalizedContentDto[];

  @ApiProperty({ type: [LocalizedProblemTagDto] })
  tagsOfLocale?: LocalizedProblemTagDto[];

  @ApiProperty({ type: [ProblemTagWithAllLocalesDto] })
  tagsOfAllLocales?: ProblemTagWithAllLocalesDto[];

  @ApiProperty({ type: ProblemSampleDataMemberDto, isArray: true })
  samples?: ProblemSampleDataMemberDto[];

  @ApiProperty()
  judgeInfo?: ProblemJudgeInfo;

  @ApiProperty()
  submittable?: boolean;

  @ApiProperty({ type: ProblemFileDto, isArray: true })
  testData?: ProblemFileDto[];

  @ApiProperty({ type: ProblemFileDto, isArray: true })
  additionalFiles?: ProblemFileDto[];

  @ApiProperty()
  discussionCount?: number;

  @ApiProperty({ enum: ProblemPermissionType, isArray: true })
  permissionOfCurrentUser?: ProblemPermissionType[];

  @ApiProperty()
  accessControlList?: AccessControlListWithSubjectMeta;

  @ApiProperty()
  lastSubmission?: ProblemLastSubmissionDto;
}
