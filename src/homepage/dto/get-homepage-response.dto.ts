import { ApiProperty } from "@nestjs/swagger";

import { Locale } from "@/common/locale.type";

import { ProblemMetaDto } from "@/problem/dto";
import { UserMetaDto } from "@/user/dto";
import { SubmissionBasicMetaDto } from "@/submission/dto";
import { DiscussionMetaDto } from "@/discussion/dto";

import {
  HomepageSettingsCountdown,
  HomepageSettingsFriendLinks,
  HomepageSettingsHitokoto
} from "../homepage-settings.interface";

export class GetHomepageResponseProblemDto {
  @ApiProperty()
  meta: ProblemMetaDto;

  @ApiProperty()
  title: string;

  @ApiProperty()
  submission: SubmissionBasicMetaDto;
}

export class GetHomepageResponseDto {
  @ApiProperty()
  notice: string;

  @ApiProperty()
  noticeLocale: Locale;

  @ApiProperty({ type: [DiscussionMetaDto] })
  annnouncements: DiscussionMetaDto[];

  @ApiProperty()
  annnouncementsLocale: Locale;

  @ApiProperty()
  hitokoto?: HomepageSettingsHitokoto;

  @ApiProperty()
  countdown?: HomepageSettingsCountdown;

  @ApiProperty()
  friendLinks?: HomepageSettingsFriendLinks;

  @ApiProperty({ type: [UserMetaDto] })
  topUsers: UserMetaDto[];

  @ApiProperty({ type: [GetHomepageResponseProblemDto] })
  latestUpdatedProblems: GetHomepageResponseProblemDto[];
}
