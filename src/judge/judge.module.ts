import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { RedisModule } from "@/redis/redis.module";
import { FileModule } from "@/file/file.module";

import { JudgeQueueService } from "./judge-queue.service";
import { JudgeGateway } from "./judge.gateway";
import { JudgeClientController } from "./judge-client.controller";
import { JudgeClientService } from "./judge-client.service";
import { JudgeClientEntity } from "./judge-client.entity";

@Module({
  imports: [forwardRef(() => RedisModule), forwardRef(() => FileModule), TypeOrmModule.forFeature([JudgeClientEntity])],
  controllers: [JudgeClientController],
  providers: [JudgeGateway, JudgeClientService, JudgeQueueService],
  exports: [JudgeGateway, JudgeQueueService]
})
export class JudgeModule {}
