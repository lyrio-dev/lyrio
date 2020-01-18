import { ApiProperty } from "@nestjs/swagger";

export enum FinishUploadResponseError {
  INVALID_OPERATION = "INVALID_OPERATION",
  NOT_UPLOADED = "NOT_UPLOADED",
  IO_ERROR = "IO_ERROR",
  CHECKSUM_MISMATCH = "CHECKSUM_MISMATCH"
}

export class FinishUploadResponseDto {
  @ApiProperty()
  error?: FinishUploadResponseError;

  @ApiProperty()
  uuid?: string;
}
