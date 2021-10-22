import { ApiProperty } from "@nestjs/swagger";

import { IsInt } from "class-validator";

export class DeleteContestIssueRequestDto {
  @ApiProperty()
  @IsInt()
  contestIssueId: number;
}
