import { ApiProperty } from "@nestjs/swagger";

import { IsInt, IsString } from "class-validator";

export class ReplyContestIssueRequestDto {
  @ApiProperty()
  @IsInt()
  contestIssueId: number;

  @ApiProperty()
  @IsString()
  content: string;
}
