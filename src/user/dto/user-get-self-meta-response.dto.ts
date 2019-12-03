import { ApiModelProperty } from "@nestjs/swagger";

import { UserMetaDto } from "./user-meta.dto";

export class UserGetSelfMetaResponseDto {
  @ApiModelProperty()
  userMeta?: UserMetaDto;
}
