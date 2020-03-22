import { ApiProperty } from "@nestjs/swagger";

export enum UpdateUserEmailResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_USER = "NO_SUCH_USER",
  DUPLICATE_EMAIL = "DUPLICATE_EMAIL"
}

export class UpdateUserEmailResponseDto {
  @ApiProperty({ enum: UpdateUserEmailResponseError })
  error?: UpdateUserEmailResponseError;
}
