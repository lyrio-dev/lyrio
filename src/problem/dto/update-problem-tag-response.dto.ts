import { ApiProperty } from "@nestjs/swagger";

export enum UpdateProblemTagResponseError {
  NO_SUCH_PROBLEM_TAG = "NO_SUCH_PROBLEM_TAG",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class UpdateProblemTagResponseDto {
  @ApiProperty()
  error?: UpdateProblemTagResponseError;
}
