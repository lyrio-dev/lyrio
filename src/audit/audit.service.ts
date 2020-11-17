import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { FindConditions, Like, Repository } from "typeorm";

import { logger } from "@/logger";
import { getCurrentRequest } from "@/auth/auth.middleware";
import { UserEntity } from "@/user/user.entity";
import { Locale } from "@/common/locale.type";
import { escapeLike } from "@/database/database.utils";

import { AuditLogEntity, AuditLogObjectType } from "./audit-log.entity";
import { AuditLogQueryResult } from "./audit-log-query-result.interface";

export { AuditLogObjectType } from "./audit-log.entity";

/**
 * This struct is used to describe object passed to log()
 */
export interface AuditLogObject {
  type: AuditLogObjectType;
  id: number;
}

/**
 * An object type query handler will be used to query the object meta when a audit log related to
 * that object is queried. The handler should return a meta object to be sent to the client dierctly.
 */
type AuditLogObjectTypeQueryHandler<T> = (objectId: number, locale: Locale, currentUser: UserEntity) => Promise<T>;

@Injectable()
export class AuditService {
  /**
   * Each function should be registered via registerObjectQueryHandler()
   */
  objectTypeQueryHandlers: Partial<Record<AuditLogObjectType, AuditLogObjectTypeQueryHandler<unknown>>> = {};

  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepository: Repository<AuditLogEntity>
  ) {}

  /**
   * Register a handler for an object type.
   *
   * An object type query handler will be used to query the object meta when a audit log related to
   * that object is queried. The handler should return a meta object to be sent to the client dierctly.
   */
  registerObjectTypeQueryHandler<T>(type: AuditLogObjectType, handler: AuditLogObjectTypeQueryHandler<T>): void {
    this.objectTypeQueryHandlers[type] = handler;
  }

  async log(userId: number, action: string, details?: unknown): Promise<void>;

  async log(
    userId: number,
    action: string,
    objectType: AuditLogObjectType,
    objectId: number,
    details?: unknown
  ): Promise<void>;

  async log(
    userId: number,
    action: string,
    firstObjectType: AuditLogObjectType,
    firstObjectId: number,
    secondObjectType: AuditLogObjectType,
    secondObjectId: number,
    details?: unknown
  ): Promise<void>;

  async log(action: string, details?: unknown): Promise<void>;

  async log(action: string, objectType: AuditLogObjectType, objectId: number, details?: unknown): Promise<void>;

  async log(
    action: string,
    firstObjectType: AuditLogObjectType,
    firstObjectId: number,
    secondObjectType: AuditLogObjectType,
    secondObjectId: number,
    details?: unknown
  ): Promise<void>;

  async log(...argumentsArray: unknown[]): Promise<void> {
    let userId: number = typeof argumentsArray[0] === "number" ? (argumentsArray.shift() as number) : null;
    const details: unknown = argumentsArray.length % 2 === 0 ? argumentsArray.pop() : null;
    const [action, firstObjectType, firstObjectId, secondObjectType, secondObjectId] = argumentsArray as [
      string,
      AuditLogObjectType,
      number,
      AuditLogObjectType,
      number
    ];

    const req = getCurrentRequest();
    if (userId == null) {
      if (!req.session) {
        logger.warn(
          `Failed to get the current request session for audit logging { action: ${JSON.stringify(
            action
          )}, firstObject: <${firstObjectType} ${firstObjectId}>, secondObject: <${secondObjectType} ${secondObjectId}> }`
        );

        return;
      }

      userId = req.session.user.id;
    }

    const auditLog = new AuditLogEntity();
    auditLog.userId = userId;
    auditLog.ip = req.ip;
    auditLog.time = new Date();
    auditLog.action = action;

    if (firstObjectType) {
      auditLog.firstObjectType = firstObjectType;
      auditLog.firstObjectId = firstObjectId;
    }

    if (secondObjectType) {
      auditLog.secondObjectType = secondObjectType;
      auditLog.secondObjectId = secondObjectId;
    }

    auditLog.details = details;

    await this.auditLogRepository.save(auditLog);
  }

  // TODO: add time query
  async query(
    userId: number,
    actionQuery: string,
    ip: string,
    firstObjectId: number,
    secondObjectId: number,
    locale: Locale,
    currentUser: UserEntity,
    skipCount: number,
    takeCount: number
  ): Promise<[results: AuditLogQueryResult[], count: number]> {
    const where: FindConditions<AuditLogEntity> = {};
    if (userId != null) where.userId = userId;
    if (actionQuery != null) where.action = Like(`${escapeLike(actionQuery)}%`);
    if (ip != null) where.ip = ip;
    if (firstObjectId != null) where.firstObjectId = firstObjectId;
    if (secondObjectId != null) where.secondObjectId = secondObjectId;

    const [results, count] = await this.auditLogRepository.findAndCount({
      where,
      skip: skipCount,
      take: takeCount,
      order: {
        time: "DESC"
      }
    });

    return [
      await Promise.all(
        results.map<Promise<AuditLogQueryResult>>(async result => ({
          userId: result.userId,
          ip: result.ip,
          time: result.time,
          action: result.action,
          firstObjectType: result.firstObjectType,
          firstObjectId: result.firstObjectId,
          firstObject:
            result.firstObjectType in this.objectTypeQueryHandlers
              ? await this.objectTypeQueryHandlers[result.firstObjectType](result.firstObjectId, locale, currentUser)
              : null,
          secondObjectType: result.secondObjectType,
          secondObjectId: result.secondObjectId,
          secondObject:
            result.secondObjectType in this.objectTypeQueryHandlers
              ? await this.objectTypeQueryHandlers[result.secondObjectType](result.secondObjectId, locale, currentUser)
              : null,
          details: result.details
        }))
      ),
      count
    ];
  }
}
