import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString, Length, IsEnum, IsOptional } from "class-validator";

import { ProblemFileType } from "../problem-file.entity";

export class AddProblemFileRequestDto {
  @ApiProperty()
  @IsInt()
  readonly problemId: number;

  @ApiProperty()
  @IsEnum(ProblemFileType)
  readonly type: ProblemFileType;

  @ApiProperty()
  @IsInt()
  readonly size: number;

  @ApiProperty()
  @IsString()
  @Length(1, 256)
  readonly filename: string;

  @ApiProperty()
  @IsString()
  @Length(36, 36)
  @IsOptional()
  readonly uuid?: string;
}
