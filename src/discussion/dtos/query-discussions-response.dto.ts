import { ApiProperty } from "@nestjs/swagger";

import { Locale } from "@/common/locale.type";

import { DiscussionMetaDto } from "./discussion-meta.dto";

import { ProblemMetaDto } from "@/problem/dto";
import { UserMetaDto } from "@/user/dto";

export enum QueryDiscussionsResponseError {
  TAKE_TOO_MANY = "TAKE_TOO_MANY",
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM",
  NO_SUCH_USER = "NO_SUCH_USER",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class QueryDiscussionsResponsePermissionDto {
  @ApiProperty()
  createDiscussion?: boolean;

  @ApiProperty()
  filterNonpublic?: boolean;
}

export class QueryDiscussionsResponseProblemDto {
  @ApiProperty()
  meta: ProblemMetaDto;

  @ApiProperty()
  title: string;

  @ApiProperty()
  titleLocale: Locale;
}

export class QueryDiscussionsResponseDiscussionDto {
  @ApiProperty()
  meta: DiscussionMetaDto;

  @ApiProperty()
  problem?: QueryDiscussionsResponseProblemDto;

  @ApiProperty()
  publisher: UserMetaDto;
}

export class QueryDiscussionsResponseDto {
  @ApiProperty()
  error?: QueryDiscussionsResponseError;

  @ApiProperty({ type: [QueryDiscussionsResponseDiscussionDto] })
  discussions?: QueryDiscussionsResponseDiscussionDto[];

  @ApiProperty()
  permissions?: QueryDiscussionsResponsePermissionDto;

  @ApiProperty()
  count?: number;

  // To display the search filters
  @ApiProperty()
  filterPublisher?: UserMetaDto;

  @ApiProperty()
  filterProblem?: QueryDiscussionsResponseProblemDto;
}
