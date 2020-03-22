import { ApiProperty } from "@nestjs/swagger";

import { UserMetaDto } from "./user-meta.dto";

export enum GetUserSecuritySettingsResponseError {
  NO_SUCH_USER = "NO_SUCH_USER",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class GetUserSecuritySettingsResponseDto {
  @ApiProperty()
  error?: GetUserSecuritySettingsResponseError;

  @ApiProperty()
  meta?: UserMetaDto;

  // TODO: add more security features
}
