import { ApiProperty } from "@nestjs/swagger";

import { UserMetaDto } from "./user-meta.dto";

import { UserPrivilegeType } from "../user-privilege.entity";

export enum GetUserMetaResponseError {
  NO_SUCH_USER = "NO_SUCH_USER"
}

export class GetUserMetaResponseDto {
  @ApiProperty()
  error?: GetUserMetaResponseError;

  @ApiProperty()
  meta?: UserMetaDto;

  @ApiProperty({ enum: UserPrivilegeType, isArray: true })
  privileges?: UserPrivilegeType[];
}
