import { ApiProperty } from "@nestjs/swagger";

export class CheckAvailabilityResponseDto {
  @ApiProperty()
  usernameAvailable?: boolean;

  @ApiProperty()
  emailAvailable?: boolean;
}
