import { ApiModelProperty } from "@nestjs/swagger";

import { UserMetaDto } from "./user-meta.dto";
import { UserPrivilegeType } from "../user-privilege.entity";

export class UserGetUserMetaResponseDto {
  @ApiModelProperty()
  userMeta?: UserMetaDto;

  @ApiModelProperty()
  privileges?: UserPrivilegeType[];
}
