import fs from "fs-extra";

import { Injectable, Logger } from "@nestjs/common";
import { InjectConnection } from "@nestjs/typeorm";
import { NestExpressApplication } from "@nestjs/platform-express";

import { Connection, EntityManager } from "typeorm";
import yaml from "js-yaml";
import MariaDB from "mariadb";
import { Redis } from "ioredis";

import { UserEntity } from "@/user/user.entity";
import { RedisService } from "@/redis/redis.service";

import { MigrationConfig } from "./migration-config.schema";

@Injectable()
export class MigrationService {
  private entityManager: EntityManager;

  private config: MigrationConfig;

  private oldDatabase: MariaDB.Connection;

  private redis: Redis;

  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    private readonly redisService: RedisService
  ) {
    this.redis = this.redisService.getClient();
  }

  async migrate(configFilename: string, app: NestExpressApplication): Promise<void> {
    this.entityManager = this.connection.createEntityManager();
    this.config = yaml.load(await fs.readFile(configFilename, "utf-8")) as MigrationConfig;
    this.oldDatabase = await MariaDB.createConnection({
      host: this.config.database.host,
      port: this.config.database.port,
      user: this.config.database.username,
      password: this.config.database.password,
      database: this.config.database.database
    });

    // Check if the database is empty
    if ((await this.entityManager.count(UserEntity)) !== 0) {
      Logger.error("Can't do migration on a non-empty database.");
      process.exit(-1);
    }

    /* eslint-disable @typescript-eslint/no-var-requires */
    const { migrationUser } = require("./migrations/user");
    const { migrationProblem } = require("./migrations/problem");
    const { migrationSubmission } = require("./migrations/submission");
    const { migrationDiscussion } = require("./migrations/discussion");
    /* eslint-enable @typescript-eslint/no-var-requires */

    Logger.log("Migration started");

    const queryTablePaged = this.queryTablePaged.bind(this);

    await this.redis.flushdb();

    await migrationUser.migrate(this.entityManager, this.config, this.oldDatabase, queryTablePaged, app);
    await migrationProblem.migrate(this.entityManager, this.config, this.oldDatabase, queryTablePaged, app);
    await migrationSubmission.migrate(this.entityManager, this.config, this.oldDatabase, queryTablePaged, app);
    await migrationDiscussion.migrate(this.entityManager, this.config, this.oldDatabase, queryTablePaged, app);

    await this.redis.flushdb();

    Logger.log("Congratulations! Migration finished!");

    process.exit(0);
  }

  private async queryTablePaged<T>(
    tableName: string,
    orderByColumn: string,
    onRecord: (record: T) => Promise<void>,
    maxConcurrency = 1000
  ): Promise<void> {
    Logger.log(`Started processing table "${tableName}"`);

    const pageSize = Math.max(1000, maxConcurrency);
    const { count } = (await this.oldDatabase.query(`SELECT COUNT(*) AS \`count\` FROM \`${tableName}\``))[0];
    let processedCount = 0;

    /* eslint-disable no-await-in-loop */
    for (let i = 0; i < count; i += pageSize) {
      const results: T[] = await this.oldDatabase.query(
        `SELECT * FROM \`${tableName}\` ORDER BY \`${orderByColumn}\` LIMIT ${i}, ${pageSize}`
      );
      const resultsLength = results.length;

      while (results.length > 0) {
        const promises: Promise<void>[] = [];
        for (let j = 0; j < maxConcurrency && results.length > 0; j++) promises.push(onRecord(results.shift()));
        await Promise.all(promises);
      }

      processedCount += resultsLength;
      Logger.log(`Processing table "${tableName}" ${processedCount}/${count}`);
    }
    /* eslint-enable no-await-in-loop */

    Logger.log(`Finished processing table "${tableName}"`);
  }
}
