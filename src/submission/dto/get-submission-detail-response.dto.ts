import { ApiProperty } from "@nestjs/swagger";

import { ContestMetaDto } from "@/contest/dto";

import { SubmissionMetaDto } from "./submission-meta.dto";

import { SubmissionContent } from "../submission-content.interface";
import { SubmissionProgress } from "../submission-progress.interface";
import { SubmissionPermissionType } from "../submission.service";

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
  contest?: ContestMetaDto;

  @ApiProperty({ enum: SubmissionPermissionType, isArray: true })
  permissions?: SubmissionPermissionType[];
}
