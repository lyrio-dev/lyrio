import { ApiProperty } from "@nestjs/swagger";

export enum SetContestAccessControlListResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_CONTEST = "NO_SUCH_CONTEST",
  NO_SUCH_USER = "NO_SUCH_USER",
  NO_SUCH_GROUP = "NO_SUCH_GROUP",
  INVALID_ACL = "INVALID_ACL"
}

export class SetContestAccessControlListResponseDto {
  @ApiProperty({ enum: SetContestAccessControlListResponseError })
  error?: SetContestAccessControlListResponseError;

  @ApiProperty()
  errorObjectId?: number;
}
