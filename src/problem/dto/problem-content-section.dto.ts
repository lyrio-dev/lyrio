import { ApiProperty } from "@nestjs/swagger";

import { IsInt, IsString, Length, IsEnum, IsOptional } from "class-validator";

import { ProblemContentSection, ProblemContentSectionType } from "../problem-content.interface";

export class ProblemContentSectionDto implements ProblemContentSection {
  @ApiProperty()
  @IsString()
  @Length(1, 120)
  sectionTitle: string;

  @ApiProperty()
  @IsEnum(ProblemContentSectionType)
  type: ProblemContentSectionType;

  // If it's a text section, the sampleId is empty
  @ApiProperty()
  @IsInt()
  @IsOptional()
  sampleId?: number;

  // If it's a sample section, the text is the explanation
  @ApiProperty()
  @IsString()
  @IsOptional()
  text?: string;
}
