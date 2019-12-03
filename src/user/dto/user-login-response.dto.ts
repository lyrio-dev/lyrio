import { ApiModelProperty } from "@nestjs/swagger";

import { UserMetaDto } from "./user-meta.dto";

export enum UserLoginResponseError {
  ALREADY_LOGGEDIN = "ALREADY_LOGGEDIN",
  NO_SUCH_USER = "NO_SUCH_USER",
  WRONG_PASSWORD = "WRONG_PASSWORD"
}

export class UserLoginResponseDto {
  @ApiModelProperty()
  error?: UserLoginResponseError;

  @ApiModelProperty()
  userMeta?: UserMetaDto;

  @ApiModelProperty()
  token?: string;
}
