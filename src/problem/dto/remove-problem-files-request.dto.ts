import { ApiProperty } from "@nestjs/swagger";

import { IsInt, IsString, Length, IsEnum, IsArray } from "class-validator";

import { ProblemFileType } from "../problem-file.entity";

export class RemoveProblemFilesRequestDto {
  @ApiProperty()
  @IsInt()
  readonly problemId: number;

  @ApiProperty()
  @IsEnum(ProblemFileType)
  readonly type: ProblemFileType;

  @ApiProperty()
  @IsString({ each: true })
  @Length(1, 256, { each: true })
  @IsArray()
  readonly filenames: string[];
}
