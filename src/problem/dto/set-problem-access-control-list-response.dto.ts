import { ApiProperty } from "@nestjs/swagger";

export enum SetProblemAccessControlListResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM",
  NO_SUCH_USER = "NO_SUCH_USER",
  NO_SUCH_GROUP = "NO_SUCH_GROUP",
  INVALID_ACL = "INVALID_ACL"
}

export class SetProblemAccessControlListResponseDto {
  @ApiProperty({ enum: SetProblemAccessControlListResponseError })
  error?: SetProblemAccessControlListResponseError;

  @ApiProperty()
  errorObjectId?: number;
}
