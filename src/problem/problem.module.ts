import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { LocalizedContentModule } from "@/localized-content/localized-content.module";
import { UserModule } from "@/user/user.module";
import { GroupModule } from "@/group/group.module";
import { PermissionModule } from "@/permission/permission.module";
import { FileModule } from "@/file/file.module";
import { RedisModule } from "@/redis/redis.module";
import { SubmissionModule } from "@/submission/submission.module";
import { ProblemTypeModule } from "@/problem-type/problem-type.module";
import { AuditModule } from "@/audit/audit.module";
import { DiscussionModule } from "@/discussion/discussion.module";
import { ContestModule } from "@/contest/contest.module";

import { ProblemService } from "./problem.service";
import { ProblemController } from "./problem.controller";
import { ProblemTagMapEntity } from "./problem-tag-map.entity";
import { ProblemTagEntity } from "./problem-tag.entity";
import { ProblemFileEntity } from "./problem-file.entity";
import { ProblemSampleEntity } from "./problem-sample.entity";
import { ProblemJudgeInfoEntity } from "./problem-judge-info.entity";
import { ProblemEntity } from "./problem.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([ProblemEntity]),
    TypeOrmModule.forFeature([ProblemJudgeInfoEntity]),
    TypeOrmModule.forFeature([ProblemSampleEntity]),
    TypeOrmModule.forFeature([ProblemFileEntity]),
    TypeOrmModule.forFeature([ProblemTagEntity]),
    TypeOrmModule.forFeature([ProblemTagMapEntity]),
    forwardRef(() => LocalizedContentModule),
    forwardRef(() => UserModule),
    forwardRef(() => GroupModule),
    forwardRef(() => PermissionModule),
    forwardRef(() => FileModule),
    forwardRef(() => RedisModule),
    forwardRef(() => SubmissionModule),
    forwardRef(() => ProblemTypeModule),
    forwardRef(() => AuditModule),
    forwardRef(() => DiscussionModule),
    forwardRef(() => ContestModule)
  ],
  providers: [ProblemService],
  controllers: [ProblemController],
  exports: [ProblemService]
})
export class ProblemModule {}
