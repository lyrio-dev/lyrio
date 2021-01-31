import { Module } from "@nestjs/common";

import { RedisService } from "./redis.service";
import { LockService } from "./lock.service";

@Module({
  providers: [RedisService, LockService],
  exports: [RedisService, LockService]
})
export class RedisModule {}
