import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsEnum } from "class-validator";
import { PermissionType } from "@/permission/permission.service";

export class SetProblemPermissionsRequestDto {
  @ApiProperty()
  @IsInt()
  problemId: number;

  @ApiProperty()
  @IsEnum(PermissionType)
  permissionType: PermissionType;

  @ApiProperty({ type: Number, isArray: true })
  @IsInt({ each: true })
  userIds: number[];

  @ApiProperty({ type: Number, isArray: true })
  @IsInt({ each: true })
  groupIds: number[];
}
