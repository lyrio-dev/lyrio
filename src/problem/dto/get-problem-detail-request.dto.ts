import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsEnum } from "class-validator";
import { IsIntString } from "@/common/validators";
import { Locale } from "@/common/locale.type";

export class GetProblemDetailRequestDto {
  @ApiProperty()
  @IsIntString()
  @IsOptional()
  readonly id?: string;

  @ApiProperty()
  @IsIntString()
  @IsOptional()
  readonly displayId?: string;

  @ApiProperty()
  @IsEnum(Locale)
  readonly locale: Locale;
}
