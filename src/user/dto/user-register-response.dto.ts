import { ApiModelProperty } from "@nestjs/swagger";

import { UserMetaDto } from "./user-meta.dto";

export enum UserRegisterResponseError {
  ALREADY_LOGGEDIN = "ALREADY_LOGGEDIN",
  DUPLICATE_USERNAME = "DUPLICATE_USERNAME",
  DUPLICATE_EMAIL = "DUPLICATE_EMAIL"
}

export class UserRegisterResponseDto {
  @ApiModelProperty()
  error?: UserRegisterResponseError;

  @ApiModelProperty()
  userMeta?: UserMetaDto;

  @ApiModelProperty()
  token?: string;
}
