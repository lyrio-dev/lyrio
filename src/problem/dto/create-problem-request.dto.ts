import { ApiModelProperty } from "@nestjs/swagger";
import { ValidateNested, IsEnum } from "class-validator";
import { ProblemStatementDto } from "./problem-statement.dto";
import { ProblemType } from "../problem.entity";

export class CreateProblemRequestDto {
  @ApiModelProperty()
  @IsEnum(ProblemType)
  readonly type: ProblemType;

  @ApiModelProperty()
  @ValidateNested()
  readonly statement: ProblemStatementDto;
}
