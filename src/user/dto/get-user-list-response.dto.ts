import { ApiProperty } from "@nestjs/swagger";

import { UserMetaDto } from "./user-meta.dto";

export enum GetUserListResponseError {
  TAKE_TOO_MANY = "TAKE_TOO_MANY"
}

export class GetUserListResponseDto {
  @ApiProperty()
  error?: GetUserListResponseError;

  @ApiProperty({ type: [UserMetaDto] })
  userMetas?: UserMetaDto[];

  @ApiProperty()
  count?: number;
}
