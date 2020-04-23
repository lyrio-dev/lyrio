import { ApiProperty } from "@nestjs/swagger";

import { GroupMetaDto } from "./group-meta.dto";

export class GetGroupListResponseDto {
  @ApiProperty({ type: [GroupMetaDto] })
  groups: GroupMetaDto[];

  @ApiProperty({ type: [Number] })
  groupsWithAdminPermission: number[];
}
