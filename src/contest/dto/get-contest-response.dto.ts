import { ApiProperty } from "@nestjs/swagger";

import { Locale } from "@/common/locale.type";

import { ContestMetaDto } from "./contest-meta.dto";
import { ContestAnnouncementDto } from "./contest-announcement.dto";
import { ContestIssueDto } from "./contest-issue.dto";
import { ContestPermissionType, ContestUserRole } from "../contest.service";

import { ProblemMetaDto } from "@/problem/dto";

Error.stackTraceLimit = 999;
console.log(new Error)

export enum GetContestResponseError {
  NO_SUCH_CONTEST = "NO_SUCH_CONTEST",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class GetContestResponseDto {
  @ApiProperty()
  error?: GetContestResponseError;

  @ApiProperty()
  contest?: ContestMetaDto;

  @ApiProperty()
  description?: string;

  @ApiProperty()
  descriptionLocale?: Locale;

  @ApiProperty({ type: [ProblemMetaDto] })
  problems?: ProblemMetaDto[];

  @ApiProperty({ type: [ContestAnnouncementDto] })
  announcements?: ContestAnnouncementDto[];

  @ApiProperty()
  announcementsSubscription?: string;

  @ApiProperty({ type: [ContestIssueDto] })
  issues?: ContestIssueDto[];

  @ApiProperty()
  issuesSubscription?: string;

  @ApiProperty()
  currentUserRole?: ContestUserRole;

  @ApiProperty({ enum: ContestPermissionType, isArray: true })
  permissions?: ContestPermissionType[];
}
