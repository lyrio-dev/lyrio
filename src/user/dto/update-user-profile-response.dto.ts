import { ApiProperty } from "@nestjs/swagger";

export enum UpdateUserProfileResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_USER = "NO_SUCH_USER",
  DUPLICATE_USERNAME = "DUPLICATE_USERNAME",
  DUPLICATE_EMAIL = "DUPLICATE_EMAIL"
}

export class UpdateUserProfileResponseDto {
  @ApiProperty({ enum: UpdateUserProfileResponseError })
  error?: UpdateUserProfileResponseError;
}
