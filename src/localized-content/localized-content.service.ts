import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, EntityManager } from "typeorm";

import {
  LocalizedContentEntity,
  LocalizedContentType
} from "./localized-content.entity";
import { Locale } from "@/common/locale.type";

@Injectable()
export class LocalizedContentService {
  constructor(
    @InjectRepository(LocalizedContentEntity)
    private readonly localizedContentRepository: Repository<
      LocalizedContentEntity
    >
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

    await queryBuilder
      .insert()
      .into(LocalizedContentEntity)
      .values(localizedContent)
      .orUpdate({ overwrite: ["data"] })
      .execute();
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

    if (transactionalEntityManager)
      await transactionalEntityManager.delete(LocalizedContentEntity, match);
    else await this.localizedContentRepository.delete(match);
  }

  async get(
    objectId: number,
    type: LocalizedContentType,
    locale: Locale
  ): Promise<string> {
    const localizedContent = await this.localizedContentRepository.findOne({
      objectId: objectId,
      type: type,
      locale: locale
    });

    return localizedContent ? localizedContent.data : null;
  }

  async getOfAllLocales(
    objectId: number,
    type: LocalizedContentType
  ): Promise<Partial<Record<Locale, string>>> {
    const localizedContents = await this.localizedContentRepository.find({
      objectId: objectId,
      type: type
    });

    let result: Partial<Record<Locale, string>> = {};
    for (const localizedContent of localizedContents)
      result[localizedContent.locale] = localizedContent.data;
    return result;
  }

  async getOfAnyLocale(
    objectId: number,
    type: LocalizedContentType
  ): Promise<[Locale, string]> {
    const localizedContent = await this.localizedContentRepository.findOne({
      objectId: objectId,
      type: type
    });

    return localizedContent
      ? [localizedContent.locale, localizedContent.data]
      : null;
  }

  async countLocales(
    objectId: number,
    type: LocalizedContentType
  ): Promise<number> {
    return await this.localizedContentRepository.count({
      objectId: objectId,
      type: type
    });
  }
}
