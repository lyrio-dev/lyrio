import { ApiProperty } from "@nestjs/swagger";
import { Length } from "class-validator";

export class SearchGroupRequestDto {
  @ApiProperty()
  @Length(1, 24)
  readonly query?: string;
}
