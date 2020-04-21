import { ApiProperty } from "@nestjs/swagger";

import { GroupMetaDto } from "./group-meta.dto";

export class GetGroupListResponseDto {
  @ApiProperty()
  groups: GroupMetaDto[];

  @ApiProperty()
  groupsWithAdminPermission: number[];
}
