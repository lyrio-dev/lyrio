import { ApiProperty } from "@nestjs/swagger";

import { SignedFileUploadRequestDto } from "@/file/dto";

export enum AddProblemFileResponseError {
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  TOO_MANY_FILES = "TOO_MANY_FILES",
  TOTAL_SIZE_TOO_LARGE = "TOTAL_SIZE_TOO_LARGE",

  // Below only happen when user uploaded the file and call this API twice.
  FILE_UUID_EXISTS = "FILE_UUID_EXISTS",
  FILE_NOT_UPLOADED = "FILE_NOT_UPLOADED"
}

export class AddProblemFileResponseDto {
  @ApiProperty()
  error?: AddProblemFileResponseError;

  @ApiProperty()
  signedUploadRequest?: SignedFileUploadRequestDto;
}
