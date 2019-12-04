import { ApiModelProperty } from "@nestjs/swagger";

export enum DeleteGroupResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_GROUP = "NO_SUCH_GROUP",
  GROUP_NOT_EMPTY = "GROUP_NOT_EMPTY",
  GROUP_HAVE_PRIVILIGE = "GROUP_HAVE_PRIVILIGE"
}

export class DeleteGroupResponseDto {
  @ApiModelProperty()
  error?: DeleteGroupResponseError;
}
