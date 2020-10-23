import { ApiProperty } from "@nestjs/swagger";

import { Type } from "class-transformer";
import { IsInt, IsEnum, ValidateNested } from "class-validator";

import { ProblemPermissionLevel } from "../problem.service";

class SetProblemPermissionsRequestUserPermissionDto {
  @ApiProperty()
  @IsInt()
  userId: number;

  @ApiProperty({ enum: Object.values(ProblemPermissionLevel).filter(x => typeof x === "number") })
  @IsEnum(ProblemPermissionLevel)
  permissionLevel: ProblemPermissionLevel;
}

class SetProblemPermissionsRequestGroupPermissionDto {
  @ApiProperty()
  @IsInt()
  groupId: number;

  @ApiProperty({ enum: Object.values(ProblemPermissionLevel).filter(x => typeof x === "number") })
  @IsEnum(ProblemPermissionLevel)
  permissionLevel: ProblemPermissionLevel;
}

export class SetProblemPermissionsRequestDto {
  @ApiProperty()
  @IsInt()
  problemId: number;

  @ApiProperty({ type: SetProblemPermissionsRequestUserPermissionDto, isArray: true })
  @ValidateNested({ each: true })
  @Type(() => SetProblemPermissionsRequestUserPermissionDto)
  userPermissions: SetProblemPermissionsRequestUserPermissionDto[];

  @ApiProperty({ type: SetProblemPermissionsRequestGroupPermissionDto, isArray: true })
  @ValidateNested({ each: true })
  @Type(() => SetProblemPermissionsRequestGroupPermissionDto)
  groupPermissions: SetProblemPermissionsRequestGroupPermissionDto[];
}
