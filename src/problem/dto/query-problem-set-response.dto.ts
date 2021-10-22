import { ApiProperty } from "@nestjs/swagger";

import { Locale } from "@/common/locale.type";

import { LocalizedProblemTagDto } from "./localized-problem-tag.dto";

import { ProblemMetaDto } from "./problem-meta.dto";

import { UserMetaDto } from "@/user/dto";

import { SubmissionBasicMetaDto } from "@/submission/dto";

export enum QueryProblemSetResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class QueryProblemSetResponseItemDto {
  @ApiProperty()
  meta: ProblemMetaDto;

  @ApiProperty({ type: [LocalizedProblemTagDto] })
  tags?: LocalizedProblemTagDto[];

  @ApiProperty()
  submission?: SubmissionBasicMetaDto;
}

export class QueryProblemSetResponsePermissionDto {
  @ApiProperty()
  createProblem?: boolean;

  @ApiProperty()
  manageTags?: boolean;

  @ApiProperty()
  filterByOwner?: boolean;

  @ApiProperty()
  filterNonpublic?: boolean;
}

export class QueryProblemSetResponseDto {
  @ApiProperty({ enum: QueryProblemSetResponseError })
  error?: QueryProblemSetResponseError;

  @ApiProperty({ type: QueryProblemSetResponseItemDto, isArray: true })
  result?: QueryProblemSetResponseItemDto[];

  @ApiProperty()
  count?: number;

  // To display the search filters
  @ApiProperty({ type: [LocalizedProblemTagDto] })
  filterTags?: LocalizedProblemTagDto[];

  @ApiProperty()
  filterOwner?: UserMetaDto;

  @ApiProperty()
  permissions?: QueryProblemSetResponsePermissionDto;
}
