import { ApiProperty } from "@nestjs/swagger";

export enum SetProblemDisplayIdResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM",
  DUPLICATE_DISPLAY_ID = "DUPLICATE_DISPLAY_ID"
}

export class SetProblemDisplayIdResponseDto {
  @ApiProperty()
  error?: SetProblemDisplayIdResponseError;
}
