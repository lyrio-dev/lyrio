import { ApiProperty } from "@nestjs/swagger";

export enum DeleteProblemTagResponseError {
  NO_SUCH_PROBLEM_TAG = "NO_SUCH_PROBLEM_TAG",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class DeleteProblemTagResponseDto {
  @ApiProperty()
  error?: DeleteProblemTagResponseError;
}
