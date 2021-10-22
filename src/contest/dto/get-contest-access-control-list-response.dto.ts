import { ApiProperty } from "@nestjs/swagger";

import { AccessControlListWithSubjectMeta } from "@/permission/permission.service";

export enum GetContestAccessControlListResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_CONTEST = "NO_SUCH_CONTEST"
}

export class GetContestAccessControlListResponseDto {
  @ApiProperty({ enum: GetContestAccessControlListResponseError })
  error?: GetContestAccessControlListResponseError;

  @ApiProperty()
  accessControlList?: AccessControlListWithSubjectMeta;

  @ApiProperty()
  haveManagePermissionsPermission?: boolean;
}
