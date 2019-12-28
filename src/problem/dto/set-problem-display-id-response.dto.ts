import { ApiProperty } from "@nestjs/swagger";

export enum SetProblemDisplayIdResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM",
  DUPLICATE_DISPLAY_ID = "DUPLICATE_DISPLAY_ID",
  PUBLIC_PROBLEM_MUST_HAVE_DISPLAY_ID = "PUBLIC_PROBLEM_MUST_HAVE_DISPLAY_ID"
}

export class SetProblemDisplayIdResponseDto {
  @ApiProperty({ enum: SetProblemDisplayIdResponseError })
  error?: SetProblemDisplayIdResponseError;
}
