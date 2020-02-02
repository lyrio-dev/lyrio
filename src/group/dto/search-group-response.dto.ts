import { ApiProperty } from "@nestjs/swagger";

import { GroupMetaDto } from "./group-meta.dto";

export class SearchGroupResponseDto {
  @ApiProperty({ type: [GroupMetaDto] })
  groupMetas: GroupMetaDto[];
}
