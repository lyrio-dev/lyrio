import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { IsIntString } from "@/common/validators";
import { PermissionType } from "@/permission/permission.service";

export class GetProblemPermissionsRequestDto {
  @ApiProperty()
  @IsIntString()
  readonly problemId: string;

  @ApiProperty()
  @IsEnum(PermissionType)
  permissionType: PermissionType;
}
