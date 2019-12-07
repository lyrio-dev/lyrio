import { ApiModelProperty } from "@nestjs/swagger";
import { IsNumberString, IsOptional, IsEnum } from "class-validator";
import { Locale } from "@/common/locale.type";

export class GetProblemDetailRequestDto {
  @ApiModelProperty()
  @IsNumberString()
  @IsOptional()
  readonly id?: string;

  @ApiModelProperty()
  @IsNumberString()
  @IsOptional()
  readonly displayId?: string;

  @ApiModelProperty()
  @IsEnum(Locale)
  readonly locale: Locale;
}
