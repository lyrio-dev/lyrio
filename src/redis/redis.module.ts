import { Module, forwardRef } from "@nestjs/common";

import { ConfigModule } from "@/config/config.module";

import { RedisService } from "./redis.service";

@Module({
  imports: [forwardRef(() => ConfigModule)],
  providers: [RedisService],
  exports: [RedisService]
})
export class RedisModule {}
