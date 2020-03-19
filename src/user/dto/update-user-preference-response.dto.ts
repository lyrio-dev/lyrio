import { ApiProperty } from "@nestjs/swagger";

export enum UpdateUserPreferenceResponseError {
  NO_SUCH_USER = "NO_SUCH_USER",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class UpdateUserPreferenceResponseDto {
  @ApiProperty()
  error?: UpdateUserPreferenceResponseError;
}
