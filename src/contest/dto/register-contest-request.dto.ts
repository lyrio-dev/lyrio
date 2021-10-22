import { ApiProperty } from "@nestjs/swagger";

import { IsInt } from "class-validator";

export class RegisterContestRequestDto {
  @IsInt()
  @ApiProperty()
  contestId: number;
}
