import { ApiProperty } from "@nestjs/swagger";

import { Length, IsIn, IsOptional } from "class-validator";

export class SearchUserRequestDto {
  @ApiProperty()
  @Length(1, 24)
  readonly query: string;

  @ApiProperty({ enum: ["Start", "End", "Both"] })
  @IsIn(["Start", "End", "Both"])
  @IsOptional()
  readonly wildcard?: "Start" | "End" | "Both";
}
