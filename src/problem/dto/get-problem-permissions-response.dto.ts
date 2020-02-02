import { ApiProperty } from "@nestjs/swagger";
import { UserMetaDto } from "@/user/dto";
import { GroupMetaDto } from "@/group/dto";
import { ProblemPermissionLevel } from "../problem.service";

export enum GetProblemPermissionsResponseError {
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

class GetProblemPermissionsResponseUserPermissionDto {
  @ApiProperty()
  user: UserMetaDto;

  @ApiProperty({ enum: Object.values(ProblemPermissionLevel).filter(x => typeof x === "number") })
  permissionLevel: ProblemPermissionLevel;
}

class GetProblemPermissionsResponseGroupPermissionDto {
  @ApiProperty()
  group: GroupMetaDto;

  @ApiProperty({ enum: Object.values(ProblemPermissionLevel).filter(x => typeof x === "number") })
  permissionLevel: ProblemPermissionLevel;
}

export class GetProblemPermissionsResponseDto {
  @ApiProperty({ enum: GetProblemPermissionsResponseError })
  error?: GetProblemPermissionsResponseError;

  @ApiProperty()
  owner?: UserMetaDto;

  @ApiProperty({ type: GetProblemPermissionsResponseUserPermissionDto, isArray: true })
  userPermissions?: GetProblemPermissionsResponseUserPermissionDto[];

  @ApiProperty({ type: GetProblemPermissionsResponseGroupPermissionDto, isArray: true })
  groupPermissions?: GetProblemPermissionsResponseGroupPermissionDto[];
}
