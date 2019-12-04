import { ApiModelProperty } from "@nestjs/swagger";

export enum CreateGroupResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  DUPLICATE_GROUP_NAME = "DUPLICATE_GROUP_NAME"
}

export class CreateGroupResponseDto {
  @ApiModelProperty()
  error?: CreateGroupResponseError;

  @ApiModelProperty()
  groupId?: number;
}
