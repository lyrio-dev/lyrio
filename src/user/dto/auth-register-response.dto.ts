import { ApiModelProperty } from "@nestjs/swagger";

import { UserMetaDto } from "./user-meta.dto";

export enum AuthRegisterResponseError {
  ALREADY_LOGGEDIN = "ALREADY_LOGGEDIN",
  DUPLICATE_USERNAME = "DUPLICATE_USERNAME",
  DUPLICATE_EMAIL = "DUPLICATE_EMAIL"
}

export class AuthRegisterResponseDto {
  @ApiModelProperty()
  error?: AuthRegisterResponseError;

  @ApiModelProperty()
  userMeta?: UserMetaDto;

  @ApiModelProperty()
  token?: string;
}
