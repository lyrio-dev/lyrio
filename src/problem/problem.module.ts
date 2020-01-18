import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ProblemEntity } from "./problem.entity";
import { ProblemJudgeInfoEntity } from "./problem-judge-info.entity";
import { ProblemController } from "./problem.controller";
import { ProblemService } from "./problem.service";
import { ProblemJudgeInfoService } from "./problem-judge-info.service";
import { ProblemJudgeInfoTraditionalService } from "./judge-info/problem-judge-info-traditional.service";
import { ProblemSampleEntity } from "./problem-sample.entity";
import { ConfigModule } from "@/config/config.module";
import { LocalizedContentModule } from "@/localized-content/localized-content.module";
import { UserModule } from "@/user/user.module";
import { GroupModule } from "@/group/group.module";
import { PermissionModule } from "@/permission/permission.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([ProblemEntity]),
    TypeOrmModule.forFeature([ProblemJudgeInfoEntity]),
    TypeOrmModule.forFeature([ProblemSampleEntity]),
    ConfigModule,
    LocalizedContentModule,
    UserModule,
    GroupModule,
    PermissionModule
  ],
  providers: [ProblemService, ProblemJudgeInfoService, ProblemJudgeInfoTraditionalService],
  controllers: [ProblemController],
  exports: [ProblemService, ProblemJudgeInfoService]
})
export class ProblemModule {}
