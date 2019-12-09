import { ApiProperty } from "@nestjs/swagger";

import { UserMetaDto } from "./user-meta.dto";

export enum AuthRegisterResponseError {
  ALREADY_LOGGEDIN = "ALREADY_LOGGEDIN",
  DUPLICATE_USERNAME = "DUPLICATE_USERNAME",
  DUPLICATE_EMAIL = "DUPLICATE_EMAIL"
}

export class AuthRegisterResponseDto {
  @ApiProperty()
  error?: AuthRegisterResponseError;

  @ApiProperty()
  userMeta?: UserMetaDto;

  @ApiProperty()
  token?: string;
}
