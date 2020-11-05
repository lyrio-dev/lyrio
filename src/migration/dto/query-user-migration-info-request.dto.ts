import { ApiProperty } from "@nestjs/swagger";

import { IsEmail, IsOptional, IsString, MaxLength } from "class-validator";

export class QueryUserMigrationInfoRequestDto {
  @ApiProperty()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @MaxLength(80)
  oldUsername?: string;
}
