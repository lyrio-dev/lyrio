import { ApiProperty } from "@nestjs/swagger";

import { UserMetaDto } from "./user-meta.dto";
import { UserPrivilegeType } from "../user-privilege.entity";

export class GetUserMetaResponseDto {
  @ApiProperty()
  userMeta?: UserMetaDto;

  @ApiProperty({ enum: UserPrivilegeType, isArray: true })
  privileges?: UserPrivilegeType[];
}
