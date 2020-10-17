import { ApiProperty } from "@nestjs/swagger";

import { IsString, IsOptional } from "class-validator";

export class GetSessionInfoRequestDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  token?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  jsonp?: string;
}
