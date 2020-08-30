import { ApiProperty } from "@nestjs/swagger";

export enum DownloadProblemFilesResponseError {
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class ProblemFileDownloadInfoDto {
  filename: string;

  downloadUrl: string;
}

export class DownloadProblemFilesResponseDto {
  @ApiProperty()
  error?: DownloadProblemFilesResponseError;

  @ApiProperty({ type: ProblemFileDownloadInfoDto, isArray: true })
  downloadInfo?: ProblemFileDownloadInfoDto[];
}
