import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString, Length, IsEnum } from "class-validator";

import { ProblemFileType } from "../problem-file.entity";

export class RemoveProblemFileRequestDto {
  @ApiProperty()
  @IsInt()
  readonly problemId: number;

  @ApiProperty()
  @IsEnum(ProblemFileType)
  readonly type: ProblemFileType;

  @ApiProperty()
  @IsString()
  @Length(1, 256)
  readonly filename: string;
}
