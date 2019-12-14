import { ApiProperty } from "@nestjs/swagger";

export enum CreateGroupResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  DUPLICATE_GROUP_NAME = "DUPLICATE_GROUP_NAME"
}

export class CreateGroupResponseDto {
  @ApiProperty({ enum: CreateGroupResponseError })
  error?: CreateGroupResponseError;

  @ApiProperty()
  groupId?: number;
}
