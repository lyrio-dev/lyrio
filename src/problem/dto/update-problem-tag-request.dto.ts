import { ApiProperty } from "@nestjs/swagger";

import { IsString, Length, ValidateNested, IsInt, ArrayNotEmpty } from "class-validator";
import { Type } from "class-transformer";

import { If } from "@/common/validators";

import { ProblemTagLocalizedNameDto } from "./problem-tag-localized-name.dto";

export class UpdateProblemTagRequestDto {
  @ApiProperty()
  @IsInt()
  id: number;

  @ApiProperty({ type: [ProblemTagLocalizedNameDto] })
  @If<ProblemTagLocalizedNameDto[]>(
    localizedNames => new Set(localizedNames.map(({ locale }) => locale)).size === localizedNames.length
  )
  @ValidateNested({ each: true })
  @ArrayNotEmpty()
  @Type(() => ProblemTagLocalizedNameDto)
  localizedNames: ProblemTagLocalizedNameDto[];

  @IsString()
  @Length(1, 20)
  color: string;
}
