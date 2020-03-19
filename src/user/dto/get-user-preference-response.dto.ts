import { ApiProperty } from "@nestjs/swagger";

import { UserMetaDto } from "./user-meta.dto";
import { UserPreferenceDto } from "./user-preference.dto";

export enum GetUserPreferenceResponseError {
  NO_SUCH_USER = "NO_SUCH_USER",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class GetUserPreferenceResponseDto {
  @ApiProperty()
  error?: GetUserPreferenceResponseError;

  @ApiProperty()
  meta?: UserMetaDto;

  @ApiProperty()
  preference?: UserPreferenceDto;
}
