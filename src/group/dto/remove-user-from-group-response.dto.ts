import { ApiProperty } from "@nestjs/swagger";

export enum RemoveUserFromGroupResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_USER = "NO_SUCH_USER",
  NO_SUCH_GROUP = "NO_SUCH_GROUP",
  USER_NOT_IN_GROUP = "USER_NOT_IN_GROUP",
  GROUP_ADMIN_CAN_NOT_BE_REMOVED = "GROUP_ADMIN_CAN_NOT_BE_REMOVED"
}

export class RemoveUserFromGroupResponseDto {
  @ApiProperty({ enum: RemoveUserFromGroupResponseError })
  error?: RemoveUserFromGroupResponseError;
}
