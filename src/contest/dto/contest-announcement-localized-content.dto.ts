import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsString } from "class-validator";

import { Locale } from "@/common/locale.type";

export class ContestAnnouncementLocalizedContentDto {
  @ApiProperty({ enum: Locale })
  @IsEnum(Locale)
  locale: Locale;

  @ApiProperty()
  @IsString()
  content: string;
}
