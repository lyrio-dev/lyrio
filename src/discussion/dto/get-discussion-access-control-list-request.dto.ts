import { ApiProperty } from "@nestjs/swagger";

import { IsInt } from "class-validator";

export class GetDiscussionAccessControlListRequestDto {
  @ApiProperty()
  @IsInt()
  id: number;
}
