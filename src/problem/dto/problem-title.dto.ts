import { ApiProperty } from "@nestjs/swagger";

import { Locale } from "@/common/locale.type";

export class ProblemTitleDto {
  @ApiProperty()
  locale: Locale;

  @ApiProperty()
  title: string;
}
