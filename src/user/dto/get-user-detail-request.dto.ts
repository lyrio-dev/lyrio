import { ApiProperty } from "@nestjs/swagger";

import { IsInt, IsDateString, IsString, MaxLength } from "class-validator";

export class GetUserDetailRequestDto {
  @ApiProperty()
  @IsInt()
  userId: number;

  // Below props are for the data for subway graph
  @ApiProperty()
  @IsString()
  @MaxLength(50)
  timezone: string;

  @ApiProperty()
  @IsDateString()
  now: string;
}
