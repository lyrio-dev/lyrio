import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ConfigModule } from "@/config/config.module";
import { RedisModule } from "@/redis/redis.module";
import { ProblemModule } from "@/problem/problem.module";
import { ProblemTypeModule } from "@/problem-type/problem-type.module";
import { JudgeModule } from "@/judge/judge.module";
import { UserModule } from "@/user/user.module";
import { SubmissionEntity } from "./submission.entity";
import { SubmissionDetailEntity } from "./submission-detail.entity";
import { SubmissionService } from "./submission.service";
import { SubmissionController } from "./submission.controller";
import { SubmissionProgressService } from "./submission-progress.service";
import { SubmissionProgressGateway } from "./submission-progress.gateway";
import { SubmissionStatisticsService } from "./submission-statistics.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([SubmissionEntity]),
    TypeOrmModule.forFeature([SubmissionDetailEntity]),
    forwardRef(() => ConfigModule),
    forwardRef(() => RedisModule),
    forwardRef(() => ProblemModule),
    forwardRef(() => ProblemTypeModule),
    forwardRef(() => JudgeModule),
    forwardRef(() => UserModule)
  ],
  providers: [SubmissionService, SubmissionProgressService, SubmissionProgressGateway, SubmissionStatisticsService],
  controllers: [SubmissionController],
  exports: [SubmissionService]
})
export class SubmissionModule {}
