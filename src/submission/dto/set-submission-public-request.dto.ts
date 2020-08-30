import { ApiProperty } from "@nestjs/swagger";

import { IsInt, IsBoolean } from "class-validator";

export class SetSubmissionPublicRequestDto {
  @ApiProperty()
  @IsInt()
  submissionId: number;

  @ApiProperty()
  @IsBoolean()
  isPublic: boolean;
}
