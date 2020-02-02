import { ApiProperty } from "@nestjs/swagger";
import { Length, IsIn, IsOptional } from "class-validator";

export class SearchUserRequestDto {
  @ApiProperty()
  @Length(1, 24)
  readonly query: string;

  @ApiProperty({ enum: ["START", "END", "BOTH"] })
  @IsIn(["START", "END", "BOTH"])
  @IsOptional()
  readonly wildcard?: "START" | "END" | "BOTH";
}
