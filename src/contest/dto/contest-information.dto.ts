import { ApiProperty } from "@nestjs/swagger";

import { IsArray, IsDateString, IsEnum, IsInt, IsObject, IsString, MaxLength, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

import { Locale } from "@/common/locale.type";
import { If } from "@/common/validators";

import { ContestPublicness, ContestType } from "../contest.entity";
import { ContestOptionsDto } from "./contest-options.dto";

export class ContestLocalizedContentDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsEnum(Locale)
  locale: Locale;
}

export class ContestProblemDto {
  @ApiProperty()
  @IsInt()
  problemId: number;

  @ApiProperty()
  @IsString()
  @MaxLength(20)
  alias: string;
}

export class ContestInformationDto {
  @ApiProperty({
    description: "Only used when creating new contests."
  })
  @IsEnum(ContestType)
  type: ContestType;

  @ApiProperty({ type: [ContestLocalizedContentDto] })
  @Type(() => ContestLocalizedContentDto)
  @ValidateNested({ each: true })
  @If<ContestLocalizedContentDto[]>(
    localizedContents => new Set(localizedContents.map(c => c.locale)).size === localizedContents.length
  )
  localizedContents: ContestLocalizedContentDto[];

  @ApiProperty()
  @IsDateString()
  startTime: string;

  @ApiProperty()
  @IsDateString()
  endTime: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  participantDuration: number;

  @ApiProperty()
  @IsEnum(ContestPublicness)
  publicness: ContestPublicness;

  @ApiProperty()
  @Type(() => ContestProblemDto)
  @ValidateNested({ each: true })
  @IsArray()
  problems: ContestProblemDto[];

  @ApiProperty()
  @Type(() => ContestOptionsDto)
  @ValidateNested()
  contestOptions: ContestOptionsDto;

  @ApiProperty()
  @IsObject()
  contestTypeOptions: unknown;
}
