import { ApiProperty } from "@nestjs/swagger";

import { IsNumberString, IsEnum } from "class-validator";

import { Locale } from "@/common/locale.type";

export class GetSubmissionDetailRequestDto {
  @ApiProperty()
  @IsNumberString()
  submissionId: string;

  @ApiProperty()
  @IsEnum(Locale)
  locale: Locale;
}
