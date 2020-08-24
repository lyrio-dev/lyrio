import { ApiProperty } from "@nestjs/swagger";
import { IsInt } from "class-validator";

export class ListUserSessionsRequestDto {
  @ApiProperty()
  @IsInt()
  readonly userId: number;
}
