import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, EntityManager } from "typeorm";
import { Redis } from "ioredis";

import { LocalizedContentEntity, LocalizedContentType } from "./localized-content.entity";
import { Locale } from "@/common/locale.type";
import { RedisService } from "@/redis/redis.service";

const REDIS_KEY_LOCALIZED_CONTENT = "localized-content:%s:%d:%s";

@Injectable()
export class LocalizedContentService {
  private readonly redis: Redis;

  constructor(
    @InjectRepository(LocalizedContentEntity)
    private readonly localizedContentRepository: Repository<LocalizedContentEntity>,
    private readonly redisService: RedisService
  ) {
    this.redis = this.redisService.getClient();
  }

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

    await queryBuilder
      .insert()
      .into(LocalizedContentEntity)
      .values(localizedContent)
      .orUpdate({ overwrite: ["data"] })
      .execute();
    await this.redis.del(REDIS_KEY_LOCALIZED_CONTENT.format(type, objectId, locale));
  }

  // If locale is null, deletes all matching (objectId, type)
  async delete(
    objectId: number,
    type: LocalizedContentType,
    locale?: Locale,
    transactionalEntityManager?: EntityManager
  ): Promise<void> {
    const match: any = {
      objectId: objectId,
      type: type
    };

    if (locale) match.locale = locale;

    if (transactionalEntityManager) await transactionalEntityManager.delete(LocalizedContentEntity, match);
    else await this.localizedContentRepository.delete(match);
    await this.redis.del(REDIS_KEY_LOCALIZED_CONTENT.format(type, objectId, locale));
  }

  async get(objectId: number, type: LocalizedContentType, locale: Locale): Promise<string> {
    const key = REDIS_KEY_LOCALIZED_CONTENT.format(type, objectId, locale);
    const cachedResult = await this.redis.get(key);
    if (cachedResult) return cachedResult;

    const localizedContent = await this.localizedContentRepository.findOne({
      objectId: objectId,
      type: type,
      locale: locale
    });

    if (!localizedContent) return null;

    await this.redis.set(key, localizedContent.data);
    return localizedContent.data;
  }

  async getOfAllLocales(objectId: number, type: LocalizedContentType): Promise<Partial<Record<Locale, string>>> {
    const localizedContents = await this.localizedContentRepository.find({
      objectId: objectId,
      type: type
    });

    let result: Partial<Record<Locale, string>> = {};
    for (const localizedContent of localizedContents) result[localizedContent.locale] = localizedContent.data;
    return result;
  }

  async getOfAnyLocale(objectId: number, type: LocalizedContentType): Promise<[locale: Locale, content: string]> {
    const localizedContent = await this.localizedContentRepository.findOne({
      objectId: objectId,
      type: type
    });

    return localizedContent ? [localizedContent.locale, localizedContent.data] : null;
  }

  async countLocales(objectId: number, type: LocalizedContentType): Promise<number> {
    return await this.localizedContentRepository.count({
      objectId: objectId,
      type: type
    });
  }
}
