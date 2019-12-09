import { ApiProperty } from "@nestjs/swagger";

import { UserMetaDto } from "./user-meta.dto";
import { UserPrivilegeType } from "../user-privilege.entity";

export class UserGetUserMetaResponseDto {
  @ApiProperty()
  userMeta?: UserMetaDto;

  @ApiProperty()
  privileges?: UserPrivilegeType[];
}
