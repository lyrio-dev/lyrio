import { ApiProperty } from "@nestjs/swagger";

export enum CreateProblemTagResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class CreateProblemTagResponseDto {
  @ApiProperty()
  error?: CreateProblemTagResponseError;

  @ApiProperty()
  id?: number;
}
