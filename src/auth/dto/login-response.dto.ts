import { ApiProperty } from "@nestjs/swagger";

export enum LoginResponseError {
  ALREADY_LOGGEDIN = "ALREADY_LOGGEDIN",
  NO_SUCH_USER = "NO_SUCH_USER",
  WRONG_PASSWORD = "WRONG_PASSWORD"
}

export class LoginResponseDto {
  @ApiProperty({ enum: LoginResponseError })
  error?: LoginResponseError;

  @ApiProperty()
  token?: string;
}
