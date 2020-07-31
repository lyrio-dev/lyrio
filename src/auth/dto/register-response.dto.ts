import { ApiProperty } from "@nestjs/swagger";

export enum RegisterResponseError {
  ALREADY_LOGGEDIN = "ALREADY_LOGGEDIN",
  DUPLICATE_USERNAME = "DUPLICATE_USERNAME",
  DUPLICATE_EMAIL = "DUPLICATE_EMAIL",
  INVALID_EMAIL_VERIFICATION_CODE = "INVALID_EMAIL_VERIFICATION_CODE"
}

export class RegisterResponseDto {
  @ApiProperty({ enum: RegisterResponseError })
  error?: RegisterResponseError;

  @ApiProperty()
  token?: string;
}
