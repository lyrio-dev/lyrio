import { ApiProperty } from "@nestjs/swagger";

export enum SetDiscussionAccessControlListResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_DISCUSSION = "NO_SUCH_DISCUSSION",
  NO_SUCH_USER = "NO_SUCH_USER",
  NO_SUCH_GROUP = "NO_SUCH_GROUP",
  INVALID_ACL = "INVALID_ACL"
}

export class SetDiscussionAccessControlListResponseDto {
  @ApiProperty({ enum: SetDiscussionAccessControlListResponseError })
  error?: SetDiscussionAccessControlListResponseError;

  @ApiProperty()
  errorObjectId?: number;
}
