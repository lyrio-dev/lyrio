import { ApiProperty } from "@nestjs/swagger";

export enum AddProblemFileResponseError {
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  UPLOAD_REQUIRED = "UPLOAD_REQUIRED"
}

export class AddProblemFileResponseDto {
  @ApiProperty()
  error?: AddProblemFileResponseError;

  @ApiProperty()
  uploadUrl?: string;

  @ApiProperty()
  uploadUuid?: string;
}
