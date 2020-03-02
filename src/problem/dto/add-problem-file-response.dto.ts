import { ApiProperty } from "@nestjs/swagger";

import { FileUploadInfoDto } from "@/file/dto";

export enum AddProblemFileResponseError {
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  TOO_MANY_FILES = "TOO_MANY_FILES",
  TOTAL_SIZE_TOO_LARGE = "TOTAL_SIZE_TOO_LARGE",

  // Below only happen when user uploaded the file and call this API twice.
  INVALID_OPERATION = "INVALID_OPERATION",
  NOT_UPLOADED = "NOT_UPLOADED"
}

export class AddProblemFileResponseDto {
  @ApiProperty()
  error?: AddProblemFileResponseError;

  @ApiProperty()
  uploadInfo?: FileUploadInfoDto;
}
