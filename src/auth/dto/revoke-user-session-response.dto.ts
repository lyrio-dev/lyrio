import { ApiProperty } from "@nestjs/swagger";

export enum RevokeUserSessionResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_USER = "NO_SUCH_USER"
}

export class RevokeUserSessionResponseDto {
  @ApiProperty()
  error?: RevokeUserSessionResponseError;
}
