import { ApiProperty } from "@nestjs/swagger";

import { IsString } from "class-validator";

import { ProblemSampleDataMember } from "../problem-sample-data.interface";

export class ProblemSampleDataMemberDto implements ProblemSampleDataMember {
  @ApiProperty()
  @IsString()
  inputData: string;

  @ApiProperty()
  @IsString()
  outputData: string;
}
