import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsEnum, ArrayUnique } from "class-validator";
import { UserPrivilegeType } from "../user-privilege.entity";

export class UserSetUserPrivilegesRequestDto {
  @ApiProperty()
  @IsInt()
  readonly userId: number;

  @ApiProperty()
  @IsEnum(UserPrivilegeType, {
    each: true
  })
  @ArrayUnique()
  readonly privileges: UserPrivilegeType[];
}
