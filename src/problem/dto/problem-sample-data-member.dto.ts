import { ApiModelProperty } from "@nestjs/swagger";
import { IsString, IsBoolean } from "class-validator";
import { ProblemSampleDataMember } from "../problem-sample-data.interface";

export class ProblemSampleDataMemberDto implements ProblemSampleDataMember {
  @ApiModelProperty()
  @IsString()
  inputData: string;

  @ApiModelProperty()
  @IsString()
  outputData: string;
}
