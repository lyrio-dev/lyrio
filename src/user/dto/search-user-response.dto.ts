import { ApiProperty } from "@nestjs/swagger";

import { UserMetaDto } from "./user-meta.dto";

export class SearchUserResponseDto {
  @ApiProperty()
  userMetas: UserMetaDto[];
}
