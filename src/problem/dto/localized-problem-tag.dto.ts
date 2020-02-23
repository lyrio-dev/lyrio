import { ApiProperty } from "@nestjs/swagger";

import { Locale } from "@/common/locale.type";

export class LocalizedProblemTagDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  color: string;

  @ApiProperty()
  nameLocale: Locale;
}
