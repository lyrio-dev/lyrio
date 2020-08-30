import { ApiProperty } from "@nestjs/swagger";

import { SubmissionMetaDto } from "./submission-meta.dto";

export enum QuerySubmissionResponseError {
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM",
  NO_SUCH_USER = "NO_SUCH_USER"
}

export class QuerySubmissionResponseDto {
  @ApiProperty()
  error?: QuerySubmissionResponseError;

  @ApiProperty({ type: [SubmissionMetaDto] })
  submissions?: SubmissionMetaDto[];

  @ApiProperty()
  hasSmallerId?: boolean;

  @ApiProperty()
  hasLargerId?: boolean;

  // Only for non-finished
  @ApiProperty()
  progressSubscriptionKey?: string;
}
