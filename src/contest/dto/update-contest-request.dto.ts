import { ApiProperty } from "@nestjs/swagger";

import { Type } from "class-transformer";
import { IsInt, ValidateNested } from "class-validator";

import { ContestInformationDto } from "./contest-information.dto";

export class UpdateContestRequestDto {
  @ApiProperty()
  @IsInt()
  contestId: number;

  @ApiProperty()
  @ValidateNested()
  @Type(() => ContestInformationDto)
  contestInformation: ContestInformationDto;
}
