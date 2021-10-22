import { ApiProperty } from "@nestjs/swagger";

import { UserMetaDto } from "./user-meta.dto";

export class GetUserListResponseDto {
  @ApiProperty({ type: [UserMetaDto] })
  userMetas: UserMetaDto[];

  @ApiProperty()
  count: number;
}
