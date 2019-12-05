import { ApiModelProperty } from "@nestjs/swagger";

export enum SetGroupAdminResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_USER = "NO_SUCH_USER",
  NO_SUCH_GROUP = "NO_SUCH_GROUP",
  USER_NOT_IN_GROUP = "USER_NOT_IN_GROUP"
}

export class SetGroupAdminResponseDto {
  @ApiModelProperty()
  error?: SetGroupAdminResponseError;
}
