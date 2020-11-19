import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { plainToClass } from "class-transformer";
import { ClassType } from "class-transformer/ClassTransformer";
import { Repository } from "typeorm";

import { getSettingsKey } from "./settings.decorator";
import { SettingsEntity } from "./settings.entity";

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SettingsEntity)
    private readonly settingsRepository: Repository<SettingsEntity>
  ) {}

  async get<T>(Class: ClassType<T>): Promise<T> {
    const item = await this.settingsRepository.findOne({
      key: getSettingsKey(Class)
    });

    const result = item ? item.value : ((Class as unknown) as { defaultValue: T }).defaultValue;

    return plainToClass(Class, result);
  }

  async set<T>(value: T): Promise<void> {
    const key = getSettingsKey(value.constructor);
    if (!key) throw new TypeError("Invalid settings object passed to SettingsService.set()");

    const item = new SettingsEntity();
    item.key = key;
    item.value = value;
    await this.settingsRepository
      .createQueryBuilder()
      .insert()
      .values(item)
      .orUpdate({ overwrite: ["value"] })
      .execute();
  }
}
