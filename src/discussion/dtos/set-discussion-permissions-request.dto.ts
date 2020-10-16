import { ApiProperty } from "@nestjs/swagger";

import { IsInt, IsEnum, ValidateNested } from "class-validator";

import { DiscussionPermissionLevel } from "../discussion.service";

class SetDiscussionPermissionsRequestUserPermissionDto {
  @ApiProperty()
  @IsInt()
  userId: number;

  @ApiProperty({ enum: Object.values(DiscussionPermissionLevel).filter(x => typeof x === "number") })
  @IsEnum(DiscussionPermissionLevel)
  permissionLevel: DiscussionPermissionLevel;
}

class SetDiscussionPermissionsRequestGroupPermissionDto {
  @ApiProperty()
  @IsInt()
  groupId: number;

  @ApiProperty({ enum: Object.values(DiscussionPermissionLevel).filter(x => typeof x === "number") })
  @IsEnum(DiscussionPermissionLevel)
  permissionLevel: DiscussionPermissionLevel;
}

export class SetDiscussionPermissionsRequestDto {
  @ApiProperty()
  @IsInt()
  discussionId: number;

  @ApiProperty({ type: SetDiscussionPermissionsRequestUserPermissionDto, isArray: true })
  @ValidateNested({ each: true })
  userPermissions: SetDiscussionPermissionsRequestUserPermissionDto[];

  @ApiProperty({ type: SetDiscussionPermissionsRequestGroupPermissionDto, isArray: true })
  @ValidateNested({ each: true })
  groupPermissions: SetDiscussionPermissionsRequestGroupPermissionDto[];
}
