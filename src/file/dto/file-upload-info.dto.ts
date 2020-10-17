import { ApiProperty } from "@nestjs/swagger";

import { IsNumber, IsOptional, IsUUID, Min } from "class-validator";

export class FileUploadInfoDto {
  @ApiProperty()
  @IsUUID()
  @IsOptional()
  uuid?: string;

  @ApiProperty()
  @Min(0)
  @IsNumber()
  size: number;
}
