import { ApiProperty } from "@nestjs/swagger";

import { UserMetaDto } from "@/user/dto/user-meta.dto";

export enum RegisterResponseError {
  ALREADY_LOGGEDIN = "ALREADY_LOGGEDIN",
  DUPLICATE_USERNAME = "DUPLICATE_USERNAME",
  DUPLICATE_EMAIL = "DUPLICATE_EMAIL"
}

export class RegisterResponseDto {
  @ApiProperty()
  error?: RegisterResponseError;

  @ApiProperty()
  userMeta?: UserMetaDto;

  @ApiProperty()
  token?: string;
}
