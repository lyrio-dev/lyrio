import { ApiProperty } from "@nestjs/swagger";

import { UserMetaDto } from "@/user/dto";

export enum GetGroupMemberListResponseError {
  NO_SUCH_GROUP = "NO_SUCH_GROUP",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class GetGroupMemberListResponseItem {
  @ApiProperty()
  userMeta: UserMetaDto;

  @ApiProperty()
  isGroupAdmin: boolean;
}

export class GetGroupMemberListResponseDto {
  @ApiProperty()
  error?: GetGroupMemberListResponseError;

  @ApiProperty({ type: [GetGroupMemberListResponseItem] })
  memberList?: GetGroupMemberListResponseItem[];
}
