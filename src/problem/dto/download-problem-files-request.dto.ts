import { ApiProperty } from "@nestjs/swagger";

import { IsInt, IsEnum, Length, IsString, IsArray } from "class-validator";

import { ProblemFileType } from "../problem-file.entity";

export class DownloadProblemFilesRequestDto {
  @ApiProperty()
  @IsInt()
  readonly problemId: number;

  @ApiProperty()
  @IsEnum(ProblemFileType)
  readonly type: ProblemFileType;

  @ApiProperty({ type: String, isArray: true })
  @IsString({ each: true })
  @Length(1, 256, { each: true })
  @IsArray()
  readonly filenameList: string[];
}
