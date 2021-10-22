import { Module } from "@nestjs/common";

import { RedisModule } from "@/redis/redis.module";

import { PushGateway } from "./push.gateway";
import { BackgroundTaskProgressService } from "./background-task-progress.service";

@Module({
  imports: [RedisModule],
  providers: [PushGateway, BackgroundTaskProgressService],
  exports: [PushGateway, BackgroundTaskProgressService]
})
export class PushModule {}
