import { NestExpressApplication } from "@nestjs/platform-express";

import { EntityManager } from "typeorm";
import MariaDB from "mariadb";

import { MigrationConfig } from "../migration-config.schema";

export interface MigrationInterface {
  migrate(
    entityManager: EntityManager,
    config: MigrationConfig,
    oldDatabase: MariaDB.Connection,
    queryTablePaged: <T>(
      tableName: string,
      orderByColumn: string,
      onRecord: (record: T) => Promise<void>,
      maxConcurrency?: number
    ) => Promise<void>,
    app: NestExpressApplication
  ): Promise<void>;
}
