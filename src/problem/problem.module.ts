import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ProblemEntity } from "./problem.entity";
import { ProblemJudgeInfoEntity } from "./problem-judge-info.entity";
import { ProblemController } from "./problem.controller";
import { ProblemService } from "./problem.service";
import { ProblemJudgeInfoService } from "./problem-judge-info.service";
import { ProblemJudgeInfoTraditionalService } from "./judge-info/problem-judge-info-traditional.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([ProblemEntity]),
    TypeOrmModule.forFeature([ProblemJudgeInfoEntity])
  ],
  providers: [
    ProblemService,
    ProblemJudgeInfoService,
    ProblemJudgeInfoTraditionalService
  ],
  controllers: [ProblemController],
  exports: [ProblemService, ProblemJudgeInfoService]
})
export class ProblemModule {}
