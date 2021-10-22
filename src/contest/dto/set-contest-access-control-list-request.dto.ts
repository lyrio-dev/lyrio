import { ApiProperty } from "@nestjs/swagger";

import { IsInt, IsObject } from "class-validator";

import { AccessControlList } from "@/permission/permission.service";

import { ContestPermissionLevel } from "../contest.service";

export class SetContestAccessControlListRequestDto {
  @ApiProperty()
  @IsInt()
  contestId: number;

  @ApiProperty()
  @IsObject()
  accessControlList: AccessControlList<ContestPermissionLevel>;
}
