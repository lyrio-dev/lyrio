import { ApiProperty } from "@nestjs/swagger";

export enum CreateProblemResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_PROBLEM_TAG = "NO_SUCH_PROBLEM_TAG",
  FAILED = "FAILED"
}

export class CreateProblemResponseDto {
  @ApiProperty({ enum: CreateProblemResponseError })
  error?: CreateProblemResponseError;

  @ApiProperty()
  id?: number;
}
