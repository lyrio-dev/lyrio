import { Injectable } from "@nestjs/common";

import { ProblemType } from "../problem.entity";
import { ProblemTypedJudgeInfoServiceInterface } from "./problem-typed-judge-info-service.interface";

import { ProblemTypedJudgeInfoTraditionalService } from "./traditional/problem-typed-judge-info-traditional.service";

import { ProblemJudgeInfo } from "./problem-judge-info.interface";

@Injectable()
export class ProblemJudgeInfoService {
  private readonly typedJudgeInfoServices: Record<ProblemType, ProblemTypedJudgeInfoServiceInterface<ProblemJudgeInfo>>;

  constructor(private readonly problemTypedJudgeInfoTraditionalService: ProblemTypedJudgeInfoTraditionalService) {
    this.typedJudgeInfoServices = {
      [ProblemType.TRADITIONAL]: this.problemTypedJudgeInfoTraditionalService
    };
  }

  getDefaultJudgeInfo<T extends object>(problemType: ProblemType): T {
    return this.typedJudgeInfoServices[problemType].getDefaultJudgeInfo() as T;
  }
}
