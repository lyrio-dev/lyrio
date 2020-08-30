import { ApiProperty } from "@nestjs/swagger";

import { IsInt, IsString, IsEnum } from "class-validator";

import { ProblemFileType } from "../problem-file.entity";

export class RenameProblemFileRequestDto {
  @ApiProperty()
  @IsInt()
  readonly problemId: number;

  @ApiProperty()
  @IsEnum(ProblemFileType)
  readonly type: ProblemFileType;

  @ApiProperty()
  @IsString()
  readonly filename: string;

  @ApiProperty()
  @IsString()
  readonly newFilename: string;
}
