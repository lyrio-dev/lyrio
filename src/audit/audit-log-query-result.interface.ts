import { AuditLogObjectType } from "./audit-log.entity";

export interface AuditLogQueryResult {
  userId: number;
  ip: string;
  time: Date;
  action: string;

  firstObjectType?: AuditLogObjectType;
  firstObjectId?: number;
  firstObject?: unknown;

  secondObjectType?: AuditLogObjectType;
  secondObjectId?: number;
  secondObject?: unknown;

  details?: unknown;
}
