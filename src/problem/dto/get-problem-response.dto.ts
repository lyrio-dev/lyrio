import { ApiProperty } from "@nestjs/swagger";

import { ProblemMetaDto } from "./problem-meta.dto";
import { ProblemSampleDataMemberDto } from "./problem-sample-data-member.dto";
import { ProblemJudgeInfo } from "../problem-judge-info.interface";
import { ProblemFileDto } from "./problem-file.dto";
import { ProblemLocalizedContentDto } from "./problem-statement.dto";
import { ProblemPermissionType, ProblemPermissionLevel } from "@/problem/problem.service";
import { UserMetaDto } from "@/user/dto";
import { GroupMetaDto } from "@/group/dto";
import { LocalizedProblemTagDto } from "./localized-problem-tag.dto";
import { SubmissionBasicMetaDto } from "@/submission/dto";
import { SubmissionContent } from "@/submission/submission-content.interface";

export enum GetProblemResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM"
}

export class ProblemPermissionOfCurrentUserDto {
  @ApiProperty({ required: false })
  [ProblemPermissionType.VIEW]?: boolean;
  @ApiProperty({ required: false })
  [ProblemPermissionType.MODIFY]?: boolean;
  @ApiProperty({ required: false })
  [ProblemPermissionType.MANAGE_PERMISSION]?: boolean;
  @ApiProperty({ required: false })
  [ProblemPermissionType.MANAGE_PUBLICNESS]?: boolean;
  @ApiProperty({ required: false })
  [ProblemPermissionType.DELETE]?: boolean;
}

class ProblemUserPermissionDto {
  @ApiProperty()
  user: UserMetaDto;

  @ApiProperty({ enum: Object.values(ProblemPermissionLevel).filter(x => typeof x === "number") })
  permissionLevel: ProblemPermissionLevel;
}

class ProblemGroupPermissionDto {
  @ApiProperty()
  group: GroupMetaDto;

  @ApiProperty({ enum: Object.values(ProblemPermissionLevel).filter(x => typeof x === "number") })
  permissionLevel: ProblemPermissionLevel;
}

class ProblemPermissionsDto {
  @ApiProperty({ type: [ProblemUserPermissionDto] })
  userPermissions: ProblemUserPermissionDto[];

  @ApiProperty({ type: [ProblemGroupPermissionDto] })
  groupPermissions: ProblemGroupPermissionDto[];
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
  meta?: ProblemMetaDto;

  @ApiProperty()
  owner?: UserMetaDto;

  @ApiProperty()
  localizedContentsOfLocale?: ProblemLocalizedContentDto;

  @ApiProperty({ type: ProblemLocalizedContentDto, isArray: true })
  localizedContentsOfAllLocales?: ProblemLocalizedContentDto[];

  @ApiProperty({ type: [LocalizedProblemTagDto] })
  tagsOfLocale?: LocalizedProblemTagDto[];

  @ApiProperty({ type: ProblemSampleDataMemberDto, isArray: true })
  samples?: ProblemSampleDataMemberDto[];

  @ApiProperty()
  judgeInfo?: ProblemJudgeInfo;

  @ApiProperty({ type: ProblemFileDto, isArray: true })
  testData?: ProblemFileDto[];

  @ApiProperty({ type: ProblemFileDto, isArray: true })
  additionalFiles?: ProblemFileDto[];

  @ApiProperty()
  permissionOfCurrentUser?: ProblemPermissionOfCurrentUserDto;

  @ApiProperty()
  permissions?: ProblemPermissionsDto;

  @ApiProperty()
  lastSubmission?: ProblemLastSubmissionDto;
}
