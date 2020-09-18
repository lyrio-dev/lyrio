import { ApiProperty } from "@nestjs/swagger";

import { IsInt, IsString, Length } from "class-validator";

export class DownloadSubmissionFileRequestDto {
  @ApiProperty()
  @IsInt()
  submissionId: number;

  @ApiProperty()
  @IsString()
  @Length(1, 30)
  filename: string;
}
