import { ApiProperty } from "@nestjs/swagger";

import { UserMetaDto } from "./user-meta.dto";

export class SearchUserResponseDto {
  @ApiProperty({ type: [UserMetaDto] })
  userMetas: UserMetaDto[];
}
