import { ApiProperty } from "@nestjs/swagger";

import { IsString, Length, MaxLength } from "class-validator";

export class QueryUserMigrationInfoRequestDto {
  @ApiProperty()
  @MaxLength(80)
  @IsString()
  oldUsername: string;
}
