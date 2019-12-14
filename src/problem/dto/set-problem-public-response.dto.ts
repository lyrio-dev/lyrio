import { ApiProperty } from "@nestjs/swagger";

export enum SetProblemPublicResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM",
  NO_DISPLAY_ID = "NO_DISPLAY_ID"
}

export class SetProblemPublicResponseDto {
  @ApiProperty({ enum: SetProblemPublicResponseError })
  error?: SetProblemPublicResponseError;
}
