import { ApiProperty } from "@nestjs/swagger";

import { IsInt, Min, IsEnum, IsArray, ArrayUnique, ArrayMaxSize, IsOptional, Length, IsBoolean } from "class-validator";

import { Locale } from "@/common/locale.type";

export class QueryProblemSetRequestDto {
  @ApiProperty({ enum: Locale })
  @IsEnum(Locale)
  locale: Locale;

  // not implemented
  @ApiProperty()
  @Length(0, 100)
  @IsOptional()
  keyword?: string;

  @ApiProperty({ type: [Number] })
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsInt({ each: true })
  @IsArray()
  @IsOptional()
  tagIds?: number[];

  @ApiProperty()
  @IsInt()
  @IsOptional()
  ownerId?: number;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  nonpublic?: boolean;

  @ApiProperty()
  @IsInt()
  @Min(0)
  skipCount: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  takeCount: number;
}
