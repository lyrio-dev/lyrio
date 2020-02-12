import { Injectable } from "@nestjs/common";

import { ProblemJudgeInfoTraditional } from "./problem-judge-info-traditional.interface";
import { ProblemTypedJudgeInfoServiceInterface } from "../problem-typed-judge-info-service.interface";

@Injectable()
export class ProblemTypedJudgeInfoTraditionalService
  implements ProblemTypedJudgeInfoServiceInterface<ProblemJudgeInfoTraditional> {
  getDefaultJudgeInfo(): ProblemJudgeInfoTraditional {
    return {
      timeLimit: 1000,
      memoryLimit: 512,
      runSamples: true,
      subtasks: []
    };
  }
}
