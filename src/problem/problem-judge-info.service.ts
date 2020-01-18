import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import { Connection, Repository } from "typeorm";

import { ProblemEntity, ProblemType } from "./problem.entity";
import { ProblemJudgeInfoEntity } from "./problem-judge-info.entity";

import { ProblemService } from "./problem.service";
import { ProblemJudgeInfo } from "./judge-info/problem-judge-info.interface";
import { ProblemJudgeInfoTypedService } from "./judge-info/problem-judge-info-typed.service.interface";
import { ProblemJudgeInfoTraditionalService } from "./judge-info/problem-judge-info-traditional.service";

@Injectable()
export class ProblemJudgeInfoService {
  private readonly problemJudgeInfoServices: Record<ProblemType, ProblemJudgeInfoTypedService<ProblemJudgeInfo>>;

  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectRepository(ProblemEntity)
    private readonly problemRepository: Repository<ProblemEntity>,
    @InjectRepository(ProblemJudgeInfoEntity)
    private readonly problemJudgeInfoRepository: Repository<ProblemJudgeInfoEntity>,
    @Inject(forwardRef(() => ProblemService))
    private readonly problemService: ProblemService,
    private readonly problemJudgeInfoTraditionalService: ProblemJudgeInfoTraditionalService
  ) {
    this.problemJudgeInfoServices = {
      [ProblemType.TRADITIONAL]: this.problemJudgeInfoTraditionalService
    };
  }

  getDefaultJudgeInfoOfType<T extends ProblemJudgeInfo>(problemType: ProblemType): T {
    return this.problemJudgeInfoServices[problemType].getDefaultJudgeInfo() as T;
  }
}
