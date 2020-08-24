import { ApiProperty } from "@nestjs/swagger";

export enum RevokeUserSessionResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class RevokeUserSessionResponseDto {
  @ApiProperty()
  error?: RevokeUserSessionResponseError;
}
