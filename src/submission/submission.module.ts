import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ConfigModule } from "@/config/config.module";
import { RedisModule } from "@/redis/redis.module";
import { ProblemModule } from "@/problem/problem.module";
import { JudgeModule } from "@/judge/judge.module";
import { UserModule } from "@/user/user.module";
import { SubmissionEntity } from "./submission.entity";
import { SubmissionDetailEntity } from "./submission-detail.entity";
import { SubmissionService } from "./submission.service";
import { SubmissionController } from "./submission.controller";
import { SubmissionTypedService } from "./type/submission-typed.service";
import { SubmissionTypeTraditionalService } from "./type/traditional/submission-type-traditional.service";
import { SubmissionProgressService } from "./submission-progress.service";
import { SubmissionProgressGateway } from "./submission-progress.gateway";

@Module({
  imports: [
    TypeOrmModule.forFeature([SubmissionEntity]),
    TypeOrmModule.forFeature([SubmissionDetailEntity]),
    ConfigModule,
    RedisModule,
    ProblemModule,
    JudgeModule,
    UserModule
  ],
  providers: [
    SubmissionService,
    SubmissionProgressService,
    SubmissionProgressGateway,
    SubmissionTypedService,
    SubmissionTypeTraditionalService
  ],
  controllers: [SubmissionController],
  exports: [SubmissionService]
})
export class SubmissionModule {}
