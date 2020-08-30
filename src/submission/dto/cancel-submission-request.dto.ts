import { ApiProperty } from "@nestjs/swagger";

import { IsInt } from "class-validator";

export class CancelSubmissionRequestDto {
  @ApiProperty()
  @IsInt()
  submissionId: number;
}
