import { ApiProperty } from "@nestjs/swagger";

export enum SetUserPrivilegesResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_USER = "NO_SUCH_USER",
  FAILED = "FAILED"
}

export class SetUserPrivilegesResponseDto {
  @ApiProperty({ enum: SetUserPrivilegesResponseError })
  error?: SetUserPrivilegesResponseError;
}
