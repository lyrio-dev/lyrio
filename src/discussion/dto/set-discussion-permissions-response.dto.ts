import { ApiProperty } from "@nestjs/swagger";

export enum SetDiscussionPermissionsResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_DISCUSSION = "NO_SUCH_DISCUSSION",
  NO_SUCH_USER = "NO_SUCH_USER",
  NO_SUCH_GROUP = "NO_SUCH_GROUP"
}

export class SetDiscussionPermissionsResponseDto {
  @ApiProperty({ enum: SetDiscussionPermissionsResponseError })
  error?: SetDiscussionPermissionsResponseError;

  @ApiProperty()
  errorObjectId?: number;
}
