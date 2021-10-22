import { ApiProperty } from "@nestjs/swagger";

export enum DeleteProblemResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM",
  PROBLEM_USED_IN_CONTEST = "PROBLEM_USED_IN_CONTEST"
}

export class DeleteProblemResponseDto {
  @ApiProperty()
  error?: DeleteProblemResponseError;
}
