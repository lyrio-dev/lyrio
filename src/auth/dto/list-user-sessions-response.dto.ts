import { ApiProperty } from "@nestjs/swagger";

import { SessionInfo } from "../auth-session.service";

export enum ListUserSessionsResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class UserSessionDto implements SessionInfo {
  @ApiProperty()
  sessionId: number;

  @ApiProperty()
  loginIp: string;

  @ApiProperty()
  loginIpLocation: string;

  @ApiProperty()
  userAgent: string;

  @ApiProperty()
  loginTime: number;

  @ApiProperty()
  lastAccessTime: number;
}

export class ListUserSessionsResponseDto {
  @ApiProperty()
  error?: ListUserSessionsResponseError;

  @ApiProperty({ type: [UserSessionDto] })
  sessions?: UserSessionDto[];

  @ApiProperty({
    description: "Only available when querying the current user"
  })
  currentSessionId?: number;
}
