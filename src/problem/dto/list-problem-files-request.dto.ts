import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsEnum } from "class-validator";

import { ProblemFileType } from "../problem-file.entity";

export class ListProblemFilesRequestDto {
  @ApiProperty()
  @IsInt()
  readonly problemId: number;

  @ApiProperty()
  @IsEnum(ProblemFileType)
  readonly type: ProblemFileType;
}
