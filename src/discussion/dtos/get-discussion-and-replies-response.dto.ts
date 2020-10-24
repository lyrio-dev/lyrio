import { ApiProperty } from "@nestjs/swagger";

import { Locale } from "@/common/locale.type";

import { DiscussionOrReplyReactionsDto } from "./discussion-or-reply-reactions.dto";

import { DiscussionMetaDto } from "./discussion-meta.dto";

import { UserMetaDto } from "@/user/dto";
import { ProblemMetaDto } from "@/problem/dto";

import { DiscussionPermissionType, DiscussionReplyPermissionType } from "../discussion.service";

export enum GetDiscussionAndRepliesResponseError {
  NO_SUCH_DISCUSSION = "NO_SUCH_DISCUSSION",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  TAKE_TOO_MANY = "TAKE_TOO_MANY"
}

export class GetDiscussionAndRepliesResponseProblemDto {
  @ApiProperty()
  meta: ProblemMetaDto;

  @ApiProperty()
  title: string;

  @ApiProperty()
  titleLocale: Locale;
}

export class DiscussionDto {
  @ApiProperty()
  meta: DiscussionMetaDto;

  @ApiProperty()
  content: string;

  @ApiProperty()
  problem?: GetDiscussionAndRepliesResponseProblemDto;

  @ApiProperty()
  publisher: UserMetaDto;

  @ApiProperty()
  reactions: DiscussionOrReplyReactionsDto;

  @ApiProperty({ enum: DiscussionPermissionType, isArray: true })
  permissions: DiscussionPermissionType[];
}

export class DiscussionReplyDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  content: string;

  @ApiProperty()
  publishTime: Date;

  @ApiProperty()
  editTime: Date;

  @ApiProperty()
  isPublic: boolean;

  @ApiProperty()
  publisher: UserMetaDto;

  @ApiProperty()
  reactions: DiscussionOrReplyReactionsDto;

  @ApiProperty({
    description: "ManagePermission is not valid for replies.",
    enum: DiscussionPermissionType,
    isArray: true
  })
  permissions: DiscussionReplyPermissionType[];
}

export class GetDiscussionAndRepliesResponseDto {
  @ApiProperty()
  error?: GetDiscussionAndRepliesResponseError;

  @ApiProperty()
  discussion?: DiscussionDto;

  @ApiProperty({ type: [DiscussionReplyDto], description: "Only valid for `type` = `HeadTail`." })
  repliesHead?: DiscussionReplyDto[];

  @ApiProperty({ type: [DiscussionReplyDto], description: "Only valid for `type` = `HeadTail`." })
  repliesTail?: DiscussionReplyDto[];

  @ApiProperty({ description: "Only valid for `type` = `HeadTail`." })
  repliesTotalCount?: number;

  @ApiProperty({ type: [DiscussionReplyDto], description: "Only valid for `type` = `IdRange`." })
  repliesInRange?: DiscussionReplyDto[];

  @ApiProperty({ description: "Only valid for `type` = `IdRange`." })
  repliesCountInRange?: number;

  @ApiProperty()
  permissionCreateNewDiscussion?: boolean;
}
