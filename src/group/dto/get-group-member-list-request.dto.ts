import { ApiProperty } from "@nestjs/swagger";

export class GetGroupMemberListRequestDto {
  @ApiProperty()
  groupId: number;
}
