import { ApiProperty } from "@nestjs/swagger";

export class GetUserProfileRequestDto {
  @ApiProperty()
  userId: number;
}
