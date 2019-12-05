import { ApiModelProperty } from "@nestjs/swagger";

export enum UserSetUserPrivilegesResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_USER = "NO_SUCH_USER",
  FAILED = "FAILED"
}

export class UserSetUserPrivilegesResponseDto {
  @ApiModelProperty()
  error?: UserSetUserPrivilegesResponseError;
}
