import { ApiProperty } from "@nestjs/swagger";

import { IsEnum, IsInt, IsOptional, IsString, Length, Min } from "class-validator";

import { Locale } from "@/common/locale.type";
import { IsUsername } from "@/common/validators";

export class QueryAuditLogsRequestDto {
  @ApiProperty()
  @IsInt()
  @IsOptional()
  userId?: number;

  @ApiProperty()
  @IsUsername()
  @IsOptional()
  username?: string;

  @ApiProperty({
    description: "The query string for action field, will be matching as prefix."
  })
  @Length(0, 40)
  @IsOptional()
  actionQuery?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  ip?: string;

  @ApiProperty()
  @IsInt()
  @IsOptional()
  firstObjectId?: number;

  @ApiProperty()
  @IsInt()
  @IsOptional()
  secondObjectId?: number;

  @ApiProperty()
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
