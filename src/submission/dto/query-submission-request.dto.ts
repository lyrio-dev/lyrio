import { ApiProperty } from "@nestjs/swagger";

import { IsInt, IsString, Length, IsEnum, IsOptional, IsPositive } from "class-validator";

import { IsUsername } from "@/common/validators";

import { Locale } from "@/common/locale.type";

import { SubmissionStatus } from "../submission-status.enum";

export class QuerySubmissionRequestDto {
  @ApiProperty()
  @IsEnum(Locale)
  locale: Locale;

  @ApiProperty()
  @IsInt()
  @IsOptional()
  problemId: number;

  @ApiProperty()
  @IsInt()
  @IsOptional()
  problemDisplayId: number;

  @ApiProperty()
  @IsUsername()
  @IsOptional()
  submitter: string;

  @ApiProperty()
  @IsString()
  @Length(1, 20)
  @IsOptional()
  codeLanguage: string;

  @ApiProperty()
  @IsEnum(SubmissionStatus)
  @IsOptional()
  status: SubmissionStatus;

  // For pagination
  @ApiProperty()
  @IsInt()
  @IsOptional()
  minId: number;

  @ApiProperty()
  @IsInt()
  @IsOptional()
  maxId: number;

  @ApiProperty()
  @IsPositive()
  @IsInt()
  takeCount: number;
}
