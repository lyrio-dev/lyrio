import { AccessControlList } from "@/permission/permission.service";
import { ApiProperty } from "@nestjs/swagger";

import { IsInt, IsObject } from "class-validator";

import { DiscussionPermissionLevel } from "../discussion.service";

export class SetDiscussionAccessControlListRequestDto {
  @ApiProperty()
  @IsInt()
  discussionId: number;

  @ApiProperty()
  @IsObject()
  accessControlList: AccessControlList<DiscussionPermissionLevel>;
}
