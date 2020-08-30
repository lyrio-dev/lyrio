import { ApiProperty } from "@nestjs/swagger";

import { IsInt } from "class-validator";

export class DeleteSubmissionRequestDto {
  @ApiProperty()
  @IsInt()
  submissionId: number;
}
