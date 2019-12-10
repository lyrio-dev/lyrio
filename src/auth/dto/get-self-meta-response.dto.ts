import { ApiProperty } from "@nestjs/swagger";

import { UserMetaDto } from "@/user/dto/user-meta.dto";

export class GetSelfMetaResponseDto {
  @ApiProperty()
  userMeta?: UserMetaDto;
}
