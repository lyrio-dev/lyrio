import { ApiModelProperty } from "@nestjs/swagger";
import { IsInt, IsEnum, ArrayUnique } from "class-validator";
import { UserPrivilegeType } from "../user-privilege.entity";

export class UserSetUserPrivilegesRequestDto {
  @ApiModelProperty()
  @IsInt()
  readonly userId: number;

  @ApiModelProperty()
  @IsEnum(UserPrivilegeType, {
    each: true
  })
  @ArrayUnique()
  readonly privileges: UserPrivilegeType[];
}
