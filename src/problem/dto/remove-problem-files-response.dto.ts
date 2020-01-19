import { ApiProperty } from "@nestjs/swagger";

export enum RemoveProblemFilesResponseError {
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class RemoveProblemFilesResponseDto {
  @ApiProperty()
  error?: RemoveProblemFilesResponseError;
}
