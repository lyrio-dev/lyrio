import { ApiProperty } from "@nestjs/swagger";

import { IsInt } from "class-validator";

export class DeleteContestRequestDto {
  @IsInt()
  @ApiProperty()
  contestId: number;
}
