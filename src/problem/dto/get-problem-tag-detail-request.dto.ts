import { ApiProperty } from "@nestjs/swagger";

export class GetProblemTagDetailRequestDto {
  @ApiProperty()
  id: number;
}
