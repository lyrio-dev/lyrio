import { ApiProperty } from "@nestjs/swagger";

import { IsInt } from "class-validator";

export class GetDiscussionPermissionsRequestDto {
  @ApiProperty()
  @IsInt()
  id: number;
}
