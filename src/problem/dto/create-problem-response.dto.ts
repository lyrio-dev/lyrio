import { ApiProperty } from "@nestjs/swagger";

export enum CreateProblemResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  FAILED = "FAILED"
}

export class CreateProblemResponseDto {
  @ApiProperty({ enum: CreateProblemResponseError })
  error?: CreateProblemResponseError;

  @ApiProperty()
  id?: number;
}
