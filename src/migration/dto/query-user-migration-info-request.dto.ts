import { ApiProperty } from "@nestjs/swagger";

import { IsString, MaxLength } from "class-validator";

export class QueryUserMigrationInfoRequestDto {
  @ApiProperty()
  @MaxLength(80)
  @IsString()
  oldUsername: string;
}
