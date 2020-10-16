import { ApiProperty } from "@nestjs/swagger";

import { DiscussionPermissionLevel } from "@/discussion/discussion.service";

import { UserMetaDto } from "@/user/dto";
import { GroupMetaDto } from "@/group/dto";

export enum GetDiscussionPermissionsResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_DISCUSSION = "NO_SUCH_DISCUSSION"
}

class DiscussionUserPermissionDto {
  @ApiProperty()
  user: UserMetaDto;

  @ApiProperty({ enum: Object.values(DiscussionPermissionLevel).filter(x => typeof x === "number") })
  permissionLevel: DiscussionPermissionLevel;
}

class DiscussionGroupPermissionDto {
  @ApiProperty()
  group: GroupMetaDto;

  @ApiProperty({ enum: Object.values(DiscussionPermissionLevel).filter(x => typeof x === "number") })
  permissionLevel: DiscussionPermissionLevel;
}

class DiscussionPermissionsDto {
  @ApiProperty({ type: [DiscussionUserPermissionDto] })
  userPermissions: DiscussionUserPermissionDto[];

  @ApiProperty({ type: [DiscussionGroupPermissionDto] })
  groupPermissions: DiscussionGroupPermissionDto[];
}

export class GetDiscussionPermissionsResponseDto {
  @ApiProperty({ enum: GetDiscussionPermissionsResponseError })
  error?: GetDiscussionPermissionsResponseError;

  @ApiProperty()
  permissions?: DiscussionPermissionsDto;

  @ApiProperty()
  haveManagePermissionsPermission?: boolean;
}
