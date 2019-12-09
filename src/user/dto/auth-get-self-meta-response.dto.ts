import { ApiProperty } from "@nestjs/swagger";

import { UserMetaDto } from "./user-meta.dto";

export class AuthGetSelfMetaResponseDto {
  @ApiProperty()
  userMeta?: UserMetaDto;
}
