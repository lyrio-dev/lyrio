import { ApiProperty } from "@nestjs/swagger";

export enum RegisterResponseError {
  ALREADY_LOGGEDIN = "ALREADY_LOGGEDIN",
  DUPLICATE_USERNAME = "DUPLICATE_USERNAME",
  DUPLICATE_EMAIL = "DUPLICATE_EMAIL"
}

export class RegisterResponseDto {
  @ApiProperty({ enum: RegisterResponseError })
  error?: RegisterResponseError;

  @ApiProperty()
  token?: string;
}
