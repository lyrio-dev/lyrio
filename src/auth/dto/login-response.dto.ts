import { ApiProperty } from "@nestjs/swagger";

import { UserMetaDto } from "@/user/dto/user-meta.dto";

export enum LoginResponseError {
  ALREADY_LOGGEDIN = "ALREADY_LOGGEDIN",
  NO_SUCH_USER = "NO_SUCH_USER",
  WRONG_PASSWORD = "WRONG_PASSWORD"
}

export class LoginResponseDto {
  @ApiProperty()
  error?: LoginResponseError;

  @ApiProperty()
  userMeta?: UserMetaDto;

  @ApiProperty()
  token?: string;
}
