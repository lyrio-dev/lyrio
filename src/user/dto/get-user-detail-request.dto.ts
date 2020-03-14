import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Min, Max, IsDateString } from "class-validator";

export class GetUserDetailRequestDto {
  @ApiProperty()
  @IsInt()
  userId: number;

  // Below props are for the data for subway graph
  @ApiProperty()
  @IsInt()
  @Min(-24)
  @Max(24)
  timezoneOffset: number;

  @ApiProperty()
  @IsDateString()
  now: string;
}
