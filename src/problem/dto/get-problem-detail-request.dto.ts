import { ApiProperty } from "@nestjs/swagger";
import { IsNumberString, IsOptional, IsEnum } from "class-validator";
import { Locale } from "@/common/locale.type";

export class GetProblemDetailRequestDto {
  @ApiProperty()
  @IsNumberString()
  @IsOptional()
  readonly id?: string;

  @ApiProperty()
  @IsNumberString()
  @IsOptional()
  readonly displayId?: string;

  @ApiProperty()
  @IsEnum(Locale)
  readonly locale: Locale;
}
