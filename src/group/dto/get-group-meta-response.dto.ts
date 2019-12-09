import { ApiProperty } from "@nestjs/swagger";

import { GroupMetaDto } from "./group-meta.dto";

export enum GetGroupMetaResponseError {
  NO_SUCH_GROUP = "NO_SUCH_GROUP"
}

export class GetGroupMetaResponseDto {
  @ApiProperty()
  groupMeta?: GroupMetaDto;

  @ApiProperty()
  error?: GetGroupMetaResponseError;
}
