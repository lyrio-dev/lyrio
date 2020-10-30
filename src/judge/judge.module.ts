import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { RedisModule } from "@/redis/redis.module";
import { FileModule } from "@/file/file.module";
import { EventReportModule } from "@/event-report/event-report.module";

import { JudgeQueueService } from "./judge-queue.service";
import { JudgeGateway } from "./judge.gateway";
import { JudgeClientController } from "./judge-client.controller";
import { JudgeClientService } from "./judge-client.service";
import { JudgeClientEntity } from "./judge-client.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([JudgeClientEntity]),
    forwardRef(() => RedisModule),
    forwardRef(() => FileModule),
    forwardRef(() => EventReportModule)
  ],
  controllers: [JudgeClientController],
  providers: [JudgeGateway, JudgeClientService, JudgeQueueService],
  exports: [JudgeGateway, JudgeQueueService]
})
export class JudgeModule {}
