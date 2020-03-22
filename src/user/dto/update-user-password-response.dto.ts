import { ApiProperty } from "@nestjs/swagger";

export enum UpdateUserPasswordResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_USER = "NO_SUCH_USER",
  WRONG_OLD_PASSWORD = "WRONG_OLD_PASSWORD"
}

export class UpdateUserPasswordResponseDto {
  @ApiProperty({ enum: UpdateUserPasswordResponseError })
  error?: UpdateUserPasswordResponseError;
}
