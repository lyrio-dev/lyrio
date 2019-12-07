import { ApiModelProperty } from "@nestjs/swagger";

export enum CreateProblemResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  FAILED = "FAILED"
}

export class CreateProblemResponseDto {
  @ApiModelProperty()
  id?: number;

  @ApiModelProperty()
  error?: CreateProblemResponseError;
}
