import { ApiProperty } from "@nestjs/swagger";

export enum UserSetUserPrivilegesResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_USER = "NO_SUCH_USER",
  FAILED = "FAILED"
}

export class UserSetUserPrivilegesResponseDto {
  @ApiProperty()
  error?: UserSetUserPrivilegesResponseError;
}
