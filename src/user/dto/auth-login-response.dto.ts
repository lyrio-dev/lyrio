import { ApiProperty } from "@nestjs/swagger";

import { UserMetaDto } from "./user-meta.dto";

export enum AuthLoginResponseError {
  ALREADY_LOGGEDIN = "ALREADY_LOGGEDIN",
  NO_SUCH_USER = "NO_SUCH_USER",
  WRONG_PASSWORD = "WRONG_PASSWORD"
}

export class AuthLoginResponseDto {
  @ApiProperty()
  error?: AuthLoginResponseError;

  @ApiProperty()
  userMeta?: UserMetaDto;

  @ApiProperty()
  token?: string;
}
