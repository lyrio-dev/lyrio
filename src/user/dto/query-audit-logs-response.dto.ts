import { ApiProperty } from "@nestjs/swagger";

import { AuditLogObjectType } from "@/audit/audit.service";

import { UserMetaDto } from "./user-meta.dto";

export enum QueryAuditLogsResponseError {
  NO_SUCH_USER = "NO_SUCH_USER",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  TAKE_TOO_MANY = "TAKE_TOO_MANY"
}

export class QueryAuditLogsResponseItemDto {
  @ApiProperty()
  user: UserMetaDto;

  @ApiProperty()
  ip: string;

  @ApiProperty()
  ipLocation: string;

  @ApiProperty()
  time: Date;

  @ApiProperty()
  action: string;

  @ApiProperty()
  firstObjectType?: AuditLogObjectType;

  @ApiProperty()
  firstObjectId?: number;

  @ApiProperty()
  firstObject?: unknown;

  @ApiProperty()
  secondObjectType?: AuditLogObjectType;

  @ApiProperty()
  secondObjectId?: number;

  @ApiProperty()
  secondObject?: unknown;

  @ApiProperty()
  details?: unknown;
}

export class QueryAuditLogsResponseDto {
  @ApiProperty()
  error?: QueryAuditLogsResponseError;

  @ApiProperty({ type: [QueryAuditLogsResponseItemDto] })
  results?: QueryAuditLogsResponseItemDto[];

  @ApiProperty()
  count?: number;
}
