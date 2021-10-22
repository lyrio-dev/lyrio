import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { UserModule } from "@/user/user.module";
import { ProblemModule } from "@/problem/problem.module";
import { SubmissionModule } from "@/submission/submission.module";
import { LocalizedContentModule } from "@/localized-content/localized-content.module";
import { PermissionModule } from "@/permission/permission.module";
import { PushModule } from "@/push/push.module";
import { AuditModule } from "@/audit/audit.module";
import { RedisModule } from "@/redis/redis.module";

import { ContestEntity } from "./contest.entity";
import { ContestAnnouncementEntity } from "./contest-announcement.entity";
import { ContestProblemEntity } from "./contest-problem.entity";
import { ContestParticipantEntity } from "./contest-participant.entity";
import { ContestIssueEntity } from "./contest-issue.entity";
import { ContestConfigEntity } from "./contest-config.entity";
import { ContestParticipantProblemStatisticsEntity } from "./contest-participant-problem-statistics.entity";
import { ContestService } from "./contest.service";
import { ContestTypeFactoryService } from "./contest-type-factory.service";
import { ContestTypeBasicService } from "./types/basic/contest-type.service";
import { ContestTypeIcpcService } from "./types/icpc/contest-type.service";
import { ContestController } from "./contest.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([ContestEntity]),
    TypeOrmModule.forFeature([ContestConfigEntity]),
    TypeOrmModule.forFeature([ContestAnnouncementEntity]),
    TypeOrmModule.forFeature([ContestProblemEntity]),
    TypeOrmModule.forFeature([ContestParticipantEntity]),
    TypeOrmModule.forFeature([ContestIssueEntity]),
    TypeOrmModule.forFeature([ContestParticipantProblemStatisticsEntity]),
    forwardRef(() => UserModule),
    forwardRef(() => ProblemModule),
    forwardRef(() => SubmissionModule),
    forwardRef(() => LocalizedContentModule),
    forwardRef(() => PermissionModule),
    forwardRef(() => PushModule),
    forwardRef(() => AuditModule),
    forwardRef(() => RedisModule)
  ],
  providers: [ContestService, ContestTypeFactoryService, ContestTypeBasicService, ContestTypeIcpcService],
  controllers: [ContestController],
  exports: [ContestService, ContestTypeFactoryService]
})
export class ContestModule {}
