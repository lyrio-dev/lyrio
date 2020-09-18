import { ApiProperty } from "@nestjs/swagger";

export enum DownloadSubmissionFileResponseError {
  NO_SUCH_SUBMISSION = "NO_SUCH_SUBMISSION",
  NO_SUCH_FILE = "NO_SUCH_FILE",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class DownloadSubmissionFileResponseDto {
  @ApiProperty()
  error?: DownloadSubmissionFileResponseError;

  @ApiProperty()
  url?: string;
}
