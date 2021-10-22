import { ApiProperty } from "@nestjs/swagger";

import { IsInt, IsString } from "class-validator";

export class CreateContestIssueRequestDto {
  @ApiProperty()
  @IsInt()
  contestId: number;

  @ApiProperty()
  @IsString()
  content: string;
}
