import { ContestMetaDto } from "@/contest/dto";
import { ApiProperty } from "@nestjs/swagger";

import { SubmissionMetaDto } from "./submission-meta.dto";

export enum QuerySubmissionResponseError {
  NO_SUCH_CONTEST = "NO_SUCH_CONTEST",
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM",
  NO_SUCH_USER = "NO_SUCH_USER",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class QuerySubmissionResponseDto {
  @ApiProperty()
  error?: QuerySubmissionResponseError;

  @ApiProperty({ type: [SubmissionMetaDto] })
  submissions?: SubmissionMetaDto[];

  @ApiProperty({ description: "Only available when filtering with contest ID" })
  contest?: ContestMetaDto;

  @ApiProperty()
  hasSmallerId?: boolean;

  @ApiProperty()
  hasLargerId?: boolean;

  // Only for non-finished
  @ApiProperty()
  progressSubscriptionKey?: string;
}
