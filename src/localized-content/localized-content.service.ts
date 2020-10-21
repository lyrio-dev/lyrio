import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { Repository, EntityManager, FindConditions } from "typeorm";

import { Locale } from "@/common/locale.type";
import { RedisService } from "@/redis/redis.service";

import { LocalizedContentEntity, LocalizedContentType } from "./localized-content.entity";

const REDIS_KEY_LOCALIZED_CONTENT = "localized-content:%s:%d:%s";

@Injectable()
export class LocalizedContentService {
  constructor(
    @InjectRepository(LocalizedContentEntity)
    private readonly localizedContentRepository: Repository<LocalizedContentEntity>,
    private readonly redisService: RedisService
  ) {}

  async createOrUpdate(
    objectId: number,
    type: LocalizedContentType,
    locale: Locale,
    data: string,
    transactionalEntityManager?: EntityManager
  ): Promise<void> {
    const localizedContent = new LocalizedContentEntity();
    localizedContent.objectId = objectId;
    localizedContent.locale = locale;
    localizedContent.type = type;
    localizedContent.data = data;

    const queryBuilder = transactionalEntityManager
      ? transactionalEntityManager.createQueryBuilder()
      : this.localizedContentRepository.createQueryBuilder();

    await this.redisService.cacheDelete(REDIS_KEY_LOCALIZED_CONTENT.format(type, objectId, locale));
    await queryBuilder
      .insert()
      .into(LocalizedContentEntity)
      .values(localizedContent)
      .orUpdate({ overwrite: ["data"] })
      .execute();
    await this.redisService.cacheDelete(REDIS_KEY_LOCALIZED_CONTENT.format(type, objectId, locale));
  }

  // If locale is null, deletes all matching (objectId, type)
  async delete(
    objectId: number,
    type: LocalizedContentType,
    locale?: Locale,
    transactionalEntityManager?: EntityManager
  ): Promise<void> {
    const match: FindConditions<LocalizedContentEntity> = {
      objectId,
      type
    };

    if (locale) match.locale = locale;

    await this.redisService.cacheDelete(REDIS_KEY_LOCALIZED_CONTENT.format(type, objectId, locale));
    if (transactionalEntityManager) await transactionalEntityManager.delete(LocalizedContentEntity, match);
    else await this.localizedContentRepository.delete(match);
    await this.redisService.cacheDelete(REDIS_KEY_LOCALIZED_CONTENT.format(type, objectId, locale));
  }

  async get(objectId: number, type: LocalizedContentType, locale: Locale): Promise<string> {
    const key = REDIS_KEY_LOCALIZED_CONTENT.format(type, objectId, locale);
    const cachedResult = await this.redisService.cacheGet(key);
    if (cachedResult) return cachedResult;

    const localizedContent = await this.localizedContentRepository.findOne({
      objectId,
      type,
      locale
    });

    if (!localizedContent) return null;

    await this.redisService.cacheSet(key, localizedContent.data);
    return localizedContent.data;
  }

  async getOfAllLocales(objectId: number, type: LocalizedContentType): Promise<Partial<Record<Locale, string>>> {
    const localizedContents = await this.localizedContentRepository.find({
      objectId,
      type
    });

    const result: Partial<Record<Locale, string>> = {};
    for (const localizedContent of localizedContents) result[localizedContent.locale] = localizedContent.data;
    return result;
  }

  async getOfAnyLocale(objectId: number, type: LocalizedContentType): Promise<[locale: Locale, content: string]> {
    const localizedContent = await this.localizedContentRepository.findOne({
      objectId,
      type
    });

    return localizedContent ? [localizedContent.locale, localizedContent.data] : null;
  }

  async countLocales(objectId: number, type: LocalizedContentType): Promise<number> {
    return await this.localizedContentRepository.count({
      objectId,
      type
    });
  }
}
