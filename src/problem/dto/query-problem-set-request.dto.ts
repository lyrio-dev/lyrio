import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Min, IsEnum } from "class-validator";
import { Locale } from "@/common/locale.type";

export class QueryProblemSetRequestDto {
  // TODO:
  // searchKeyword
  // filterTags
  // userId <-- For admins to check problems created by a user

  @ApiProperty({ enum: Locale })
  @IsEnum(Locale)
  locale: Locale;

  @ApiProperty()
  @IsInt()
  @Min(0)
  skipCount: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  takeCount: number;
}
