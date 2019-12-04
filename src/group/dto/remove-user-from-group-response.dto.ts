import { ApiModelProperty } from "@nestjs/swagger";

export enum RemoveUserFromGroupResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_USER = "NO_SUCH_USER",
  NO_SUCH_GROUP = "NO_SUCH_GROUP",
  USER_NOT_IN_GROUP = "USER_NOT_IN_GROUP",
  OWNER_CAN_NOT_BE_REMOVED = "OWNER_CAN_NOT_BE_REMOVED"
}

export class RemoveUserFromGroupResponseDto {
  @ApiModelProperty()
  error?: RemoveUserFromGroupResponseError;
}
