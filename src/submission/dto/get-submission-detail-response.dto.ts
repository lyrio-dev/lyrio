import { ApiProperty } from "@nestjs/swagger";
import { SubmissionMetaDto } from "./submission-meta.dto";

import { SubmissionContent } from "../submission-content.interface";
import { SubmissionResult } from "../submission-result.interface";

export enum GetSubmissionDetailResponseError {
  NO_SUCH_SUBMISSION = "NO_SUCH_SUBMISSION",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class GetSubmissionDetailResponseDto {
  @ApiProperty()
  error?: GetSubmissionDetailResponseError;

  @ApiProperty()
  partialMeta?: SubmissionMetaDto;

  @ApiProperty()
  content?: SubmissionContent;

  @ApiProperty()
  result?: SubmissionResult;
}
