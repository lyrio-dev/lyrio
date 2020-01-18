import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString, Length, IsEnum } from "class-validator";

import { ProblemFileType } from "../problem-file.entity";

export class AddProblemFileRequestDto {
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

  @ApiProperty()
  @IsString()
  @Length(64, 64)
  readonly sha256: string;
}
