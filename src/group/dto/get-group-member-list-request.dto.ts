import { ApiProperty } from "@nestjs/swagger";

import { IsInt } from "class-validator";

export class GetGroupMemberListRequestDto {
  @ApiProperty()
  @IsInt()
  groupId: number;
}
