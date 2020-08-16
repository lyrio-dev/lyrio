import { ApiProperty } from "@nestjs/swagger";

export enum UpdateUserEmailResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_USER = "NO_SUCH_USER",
  DUPLICATE_EMAIL = "DUPLICATE_EMAIL",
  INVALID_EMAIL_VERIFICATION_CODE = "INVALID_EMAIL_VERIFICATION_CODE"
}

export class UpdateUserEmailResponseDto {
  @ApiProperty({ enum: UpdateUserEmailResponseError })
  error?: UpdateUserEmailResponseError;
}
