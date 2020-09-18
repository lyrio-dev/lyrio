import { ApiProperty } from "@nestjs/swagger";

import { Type } from "class-transformer";
import { IsInt, IsString, Length, IsEnum, ValidateNested } from "class-validator";

import { FileUploadInfoDto } from "@/file/dto";

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
  @ValidateNested()
  @Type(() => FileUploadInfoDto)
  readonly uploadInfo: FileUploadInfoDto;
}
