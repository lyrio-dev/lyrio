import { ApiProperty } from "@nestjs/swagger";

import { IsInt, IsObject } from "class-validator";

import { ProblemPermissionLevel } from "../problem.service";

import { AccessControlList } from "@/permission/permission.service";

export class SetProblemAccessControlListRequestDto {
  @ApiProperty()
  @IsInt()
  problemId: number;

  @ApiProperty()
  @IsObject()
  accessControlList: AccessControlList<ProblemPermissionLevel>;
}
