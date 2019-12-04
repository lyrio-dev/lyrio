import { ApiModelProperty } from "@nestjs/swagger";

import { GroupMetaDto } from "./group-meta.dto";

export enum GetGroupMetaResponseError {
  NO_SUCH_GROUP = "NO_SUCH_GROUP"
};

export class GetGroupMetaResponseDto {
  @ApiModelProperty()
  groupMeta?: GroupMetaDto;

  @ApiModelProperty()
  error?: GetGroupMetaResponseError;
}
