import { ApiProperty } from "@nestjs/swagger";

import { IsInt, Min, IsEnum, IsArray, ArrayUnique, ArrayMaxSize, IsOptional, Length, IsBoolean } from "class-validator";

import { Locale } from "@/common/locale.type";

export class QueryProblemSetRequestDto {
  @ApiProperty({ enum: Locale })
  @IsEnum(Locale)
  locale: Locale;

  @ApiProperty()
  @Length(0, 100)
  @IsOptional()
  keyword?: string;

  @ApiProperty({
    description: "The result item by ID may NOT be included in the count."
  })
  @IsBoolean()
  @IsOptional()
  keywordMatchesId?: boolean;

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

  @ApiProperty({
    description: "Pass true to return problem title only. For a preview in search bar."
  })
  @IsBoolean()
  @IsOptional()
  titleOnly?: boolean;

  @ApiProperty()
  @IsInt()
  @Min(0)
  skipCount: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  takeCount: number;
}
