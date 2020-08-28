import { ApiProperty } from "@nestjs/swagger";

export enum UpdateUserSelfEmailResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  DUPLICATE_EMAIL = "DUPLICATE_EMAIL",
  INVALID_EMAIL_VERIFICATION_CODE = "INVALID_EMAIL_VERIFICATION_CODE"
}

export class UpdateUserSelfEmailResponseDto {
  @ApiProperty()
  error?: UpdateUserSelfEmailResponseError;
}
