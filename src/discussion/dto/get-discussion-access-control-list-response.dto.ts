import { ApiProperty } from "@nestjs/swagger";

import { AccessControlListWithSubjectMeta } from "@/permission/permission.service";

export enum GetDiscussionAccessControlListResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_DISCUSSION = "NO_SUCH_DISCUSSION"
}

export class GetDiscussionAccessControlListResponseDto {
  @ApiProperty({ enum: GetDiscussionAccessControlListResponseError })
  error?: GetDiscussionAccessControlListResponseError;

  @ApiProperty()
  accessControlList?: AccessControlListWithSubjectMeta;

  @ApiProperty()
  haveManagePermissionsPermission?: boolean;
}
