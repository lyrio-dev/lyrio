import { ApiProperty } from "@nestjs/swagger";

import { SubmissionMetaDto } from "./submission-meta.dto";

import { SubmissionContent } from "../submission-content.interface";
import { SubmissionProgress } from "../submission-progress.interface";

export enum GetSubmissionDetailResponseError {
  NO_SUCH_SUBMISSION = "NO_SUCH_SUBMISSION",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class GetSubmissionDetailResponseDto {
  @ApiProperty()
  error?: GetSubmissionDetailResponseError;

  @ApiProperty()
  meta?: SubmissionMetaDto;

  @ApiProperty()
  content?: SubmissionContent;

  @ApiProperty()
  progress?: SubmissionProgress;

  @ApiProperty()
  progressSubscriptionKey?: string;

  @ApiProperty()
  permissionRejudge?: boolean;

  @ApiProperty()
  permissionCancel?: boolean;

  @ApiProperty()
  permissionSetPublic?: boolean;

  @ApiProperty()
  permissionDelete?: boolean;
}
