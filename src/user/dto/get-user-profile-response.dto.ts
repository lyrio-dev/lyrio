import { ApiProperty } from "@nestjs/swagger";

import { UserMetaDto } from "./user-meta.dto";
import { UserInformationDto } from "./user-information.dto";

export enum GetUserProfileResponseError {
  NO_SUCH_USER = "NO_SUCH_USER",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class GetUserProfileResponseDto {
  @ApiProperty()
  error?: GetUserProfileResponseError;

  @ApiProperty()
  meta?: UserMetaDto;

  // This property of user is not included in UserMeta type
  @ApiProperty()
  publicEmail?: boolean;

  // This property of user is not included in UserMeta type
  @ApiProperty()
  avatarInfo?: string;

  @ApiProperty()
  information?: UserInformationDto;
}
