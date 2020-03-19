import { ApiProperty } from "@nestjs/swagger";

export class GetUserPreferenceRequestDto {
  @ApiProperty()
  userId: number;
}
