import { ApiProperty } from "@nestjs/swagger";

import { IsInt } from "class-validator";

export class RejudgeSubmissionRequestDto {
  @ApiProperty()
  @IsInt()
  submissionId: number;
}
