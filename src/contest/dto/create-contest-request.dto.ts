import { ApiProperty } from "@nestjs/swagger";

import { Type } from "class-transformer";
import { ValidateNested } from "class-validator";

import { ContestInformationDto } from "./contest-information.dto";

export class CreateContestRequestDto {
  @ApiProperty()
  @ValidateNested()
  @Type(() => ContestInformationDto)
  contestInformation: ContestInformationDto;
}
