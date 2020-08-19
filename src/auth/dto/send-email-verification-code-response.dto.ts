import { ApiProperty } from "@nestjs/swagger";

export enum SendEmailVerificationCodeResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED", // Change email
  ALREADY_LOGGEDIN = "ALREADY_LOGGEDIN", // Register, Reset password
  NO_SUCH_USER = "NO_SUCH_USER", // Reset password
  DUPLICATE_EMAIL = "DUPLICATE_EMAIL", // Change email
  FAILED_TO_SEND = "FAILED_TO_SEND",
  RATE_LIMITED = "RATE_LIMITED"
}

export class SendEmailVerificationCodeResponseDto {
  @ApiProperty({ enum: SendEmailVerificationCodeResponseError })
  error?: SendEmailVerificationCodeResponseError;

  @ApiProperty()
  errorMessage?: string;
}
